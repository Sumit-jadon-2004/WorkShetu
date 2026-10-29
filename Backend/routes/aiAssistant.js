const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const Machine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const Booking = require("../models/BookingMachine.js");
const GroupBooking = require("../models/GroupBooking.js");
const Review = require("../models/Review.js");
const { isLoggedIn } = require("../middleware/auth.js");
const { detectIntent, knownMachineIds, sanitizeHistory, searchFilters, serviceSearchFilters } = require("../utils/aiIntent.js");
const { aiGeneralFallback, aiMessage, aiResponseCopy, detectAiLanguageStyle, responseMatchesAiLanguageStyle } = require("../utils/aiLanguage.js");
const { buildAssistantSystemPrompt } = require("../utils/aiPrompt.js");
const { defaultClassifier } = require("../utils/mlClassifier.js");
const { rankLabourListings, rankMachineListings } = require("../utils/mlRecommender.js");
const {
  toolDefinitions,
  normalizeRole,
  getToolsForRole,
  executeTool,
  getPendingAction,
  discardPendingAction,
  searchMachines,
  checkAvailability,
  getMachineDetails,
  searchDirectory,
  getFarmerBookings,
  getNearbyGroupBookings,
  getEligibleOffers,
  calculateBookingPrice,
  getDriverRequests,
  getDriverListings,
  getDriverEarnings,
  getDriverProfileStatus,
  getAdminDashboardStats,
  getDriverApplications,
  getPlatformBookings,
  getOfferAnalytics,
  getPlatformComplaints,
  getPlatformListings
} = require("../utils/aiToolRegistry.js");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ message: aiMessage("rateLimit", req.aiLanguage) })
});

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const groqApiUrl = () => {
  const configured = process.env.GROQ_API_URL?.trim();
  if (!configured) return GROQ_URL;
  try {
    const parsed = new URL(configured);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString() : GROQ_URL;
  } catch {
    return GROQ_URL;
  }
};
const groqModel = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function safeLogArgs(args) {
  const safe = {};
  for (const [key, value] of Object.entries(args || {})) {
    if (/key|token|password|secret|phone|credential/i.test(key)) safe[key] = "[REDACTED]";
    else if (typeof value === "string") safe[key] = value.replace(/gsk_[A-Za-z0-9_-]+/g, "[REDACTED]").slice(0, 120);
    else if (["number", "boolean"].includes(typeof value) || value == null) safe[key] = value;
  }
  return safe;
}

function redactError(value) {
  return String(value || "Unknown provider error").replace(/gsk_[A-Za-z0-9_-]+/g, "[REDACTED]").replace(/[\r\n]+/g, " ").slice(0, 300);
}

function responseRecommendations(toolResults, language) {
  const recommendations = new Map();
  for (const entry of toolResults) {
    const result = entry.result;
    if (!result) continue;

    // 1. Action confirmation card
    if (result.requiresConfirmation === true && result.actionId) {
      recommendations.set(`confirm:${result.actionId}`, {
        type: "action_confirmation",
        actionId: result.actionId,
        actionType: result.actionType,
        summary: result.summary,
        message: result.message
      });
      continue;
    }

    // 2. Farmer bookings
    if (entry.name === "getMyBookings") {
      if (Array.isArray(result.singleBookings)) {
        for (const b of result.singleBookings) {
          recommendations.set(`booking:${b.bookingId}`, {
            type: "booking",
            bookingId: b.bookingId,
            booking: b
          });
        }
      }
      if (Array.isArray(result.groupBookings)) {
        for (const gb of result.groupBookings) {
          recommendations.set(`booking:group:${gb.groupBookingId}`, {
            type: "booking",
            bookingId: gb.groupBookingId,
            booking: {
              ...gb,
              type: "Group Booking",
              service: gb.machine,
              totalPrice: gb.myFinalPrice
            }
          });
        }
      }
      continue;
    }

    // 3. Driver requests
    if (entry.name === "getDriverRequests") {
      if (Array.isArray(result.singleBookings)) {
        for (const reqItem of result.singleBookings) {
          recommendations.set(`driver_req:${reqItem.bookingId}`, {
            type: "driver_request",
            bookingId: reqItem.bookingId,
            request: reqItem
          });
        }
      }
      continue;
    }

    // 4. Platform offers
    if (entry.name === "getEligibleOffers" && Array.isArray(result)) {
      for (const o of result) {
        recommendations.set(`offer:${o.offerId}`, {
          type: "offer",
          offerId: o.offerId,
          offer: o
        });
      }
      continue;
    }

    // 5. Driver applications (for admin)
    if (entry.name === "getDriverApplications" && Array.isArray(result)) {
      for (const app of result) {
        recommendations.set(`driver_app:${app.userId}`, {
          type: "driver_application",
          applicationId: app.userId,
          application: app
        });
      }
      continue;
    }

    // 6. Machine, Labour, Transport listings
    const items = Array.isArray(result) ? result : result?.machine ? [result.machine] : [];
    for (const item of items) {
      if (!item?._id) continue;
      if (item.serviceType === "Labour" || item.serviceType === "Transport") {
        const serviceType = item.serviceType.toLowerCase();
        const serviceId = String(item._id);
        const reason = item.matchReason || [item.distanceKm != null ? aiResponseCopy("distance", language, item.distanceKm) : null]
          .filter(Boolean).join(" · ") || aiResponseCopy("match", language);
        recommendations.set(`${serviceType}:${serviceId}`, {
          type: serviceType,
          serviceId,
          reason,
          service: item
        });
        continue;
      }
      const availability = entry.name === "checkAvailability" ? result : null;
      const reason = availability
        ? availability.available ? aiResponseCopy("availableOn", language, availability.date) : aiResponseCopy("unavailableOn", language, availability.date)
        : item.matchReason || [item.distanceKm != null ? aiResponseCopy("distance", language, item.distanceKm) : null, item.averageRating != null ? aiResponseCopy("rating", language, item.averageRating, item.reviewCount) : null].filter(Boolean).join(" · ") || aiResponseCopy("match", language);
      recommendations.set(`machine:${String(item._id)}`, {
        type: "machine",
        machineId: String(item._id),
        reason,
        availabilityStatus: availability ? (availability.available ? "available" : "unavailable") : undefined,
        availabilityLabel: availability ? (availability.available ? aiResponseCopy("cardAvailable", language, availability.date) : aiResponseCopy("cardUnavailable", language, availability.date)) : undefined,
        machine: item
      });
    }
  }
  return [...recommendations.values()].slice(0, 12);
}

async function callGroq(messages, allowedTools) {
  const body = { model: groqModel(), messages };
  if (allowedTools?.length) {
    body.tools = allowedTools;
    body.tool_choice = "auto";
    body.parallel_tool_calls = false;
  }
  try {
    const response = await fetch(groqApiUrl(), {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) console.error("Groq request failed", { status: response.status, model: groqModel(), error: redactError(data?.error?.message) });
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Groq request failed", { model: groqModel(), error: error.name || "NetworkError" });
    return { ok: false, status: 0, data: { error: { message: error.name || "Network error" } } };
  }
}

function friendlyNoToolReply(intent, count, language, message) {
  if (count > 0) return aiMessage("found", language, count);
  if (["search", "nearby", "labour", "transport"].includes(intent)) return aiMessage("noResults", language);
  if (intent === "general") return aiGeneralFallback(message, language);
  return aiMessage("listingNotFound", language);
}

function responseInCurrentStyle(text, intent, recommendationCount, language, message) {
  if (responseMatchesAiLanguageStyle(text, language)) return text.trim();
  return friendlyNoToolReply(intent, recommendationCount, language, message);
}

function modelHistory(history) {
  return history.map((entry) => {
    const cards = (entry.recommendations || []).map((item) => {
      if (item.machineId) return `WorkShetu listing: ${item.title || item.machine?.title} (${item.category || item.machine?.category}), machineId ${item.machineId}`;
      if (item.serviceId) return `WorkShetu ${item.serviceType} listing: ${item.title || item.service?.title}, serviceId ${item.serviceId}`;
      return null;
    }).filter(Boolean).join("\n");
    return { role: entry.role, content: [entry.content, cards].filter(Boolean).join("\n") };
  }).filter((entry) => entry.content);
}

function localizedAuth(middleware) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 401) {
        const key = body?.message === "Your account has been disabled. Please contact support." ? "accountDisabled" : "authRequired";
        return originalJson({ ...body, message: aiMessage(key, req.aiLanguage) });
      }
      if (res.statusCode === 403) return originalJson({ ...body, message: aiMessage("forbidden", req.aiLanguage) });
      return originalJson(body);
    };
    return middleware(req, res, next);
  };
}

router.post("/assistant", (req, res, next) => {
  req.aiLanguage = detectAiLanguageStyle(req.body?.message);
  next();
}, limiter, localizedAuth(isLoggedIn), async (req, res) => {
  const language = req.aiLanguage;
  const user = req.user;
  const role = normalizeRole(user);

  // 1. Direct Two-Step Confirmation / Cancellation Workflow
  if (req.body?.actionId) {
    const actionId = String(req.body.actionId).trim();

    if (req.body.cancel === true) {
      const discarded = discardPendingAction(actionId, user._id);
      return res.json({
        message: discarded
          ? (language === "Hindi" ? "कार्रवाई सफलतापूर्वक रद्द कर दी गई।" : "The action has been cancelled.")
          : (language === "Hindi" ? "कार्रवाई नहीं मिली या समय समाप्त हो चुका है।" : "Action not found or expired."),
        recommendations: []
      });
    }

    if (req.body.confirm === true) {
      const pending = getPendingAction(actionId, user._id);
      if (!pending) {
        return res.status(400).json({
          message: language === "Hindi" ? "कार्रवाई का समय समाप्त हो गया है। कृपया पुनः प्रयास करें।" : "This action has expired. Please try again.",
          recommendations: []
        });
      }
      const executionResult = await executeTool(pending.actionType, pending.params, user, { confirm: true, actionId });
      return res.json({
        message: executionResult.message || executionResult.error || "Action executed successfully.",
        recommendations: executionResult.success ? [{ type: "action_completed", ...executionResult }] : []
      });
    }
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 1200) : "";
  if (!message) return res.status(400).json({ message: aiMessage("empty", language) });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ message: aiMessage("missingKey", language) });

  // Validate and normalize pageContext: "machines" | "labour" | "general"
  const rawPageContext = String(req.body?.pageContext || "").trim().toLowerCase();
  const pageContext = ["machines", "labour", "general"].includes(rawPageContext) ? rawPageContext : "general";

  // ML Statistical Intent Classification
  const mlClassification = defaultClassifier.classify(message);

  const history = sanitizeHistory(req.body?.history);
  const currentCoordinates = req.body?.currentCoordinates;
  const hasValidCurrentCoordinates = Number.isFinite(currentCoordinates?.latitude)
    && Number.isFinite(currentCoordinates?.longitude)
    && Math.abs(currentCoordinates.latitude) <= 90
    && Math.abs(currentCoordinates.longitude) <= 180;
  const assistantUser = hasValidCurrentCoordinates
    ? { ...user.toObject ? user.toObject() : user, latitude: currentCoordinates.latitude, longitude: currentCoordinates.longitude }
    : user;

  let intent = detectIntent(message, history, assistantUser);

  // If intent was general or ambiguous, enhance with ML intent and pageContext
  if (intent.type === "general" && !mlClassification.isLowConfidence) {
    if (mlClassification.predictedIntent === "SEARCH_LABOUR" || (pageContext === "labour" && !["HOW_TO_BOOK", "TRACK_BOOKING"].includes(mlClassification.predictedIntent))) {
      const filters = serviceSearchFilters("labour", message, history);
      intent = { type: "labour", filters };
    } else if (mlClassification.predictedIntent === "SEARCH_MACHINE" || (pageContext === "machines" && !["HOW_TO_BOOK", "TRACK_BOOKING"].includes(mlClassification.predictedIntent))) {
      intent = { type: "search", machineIds: [] };
    }
  }

  if (intent.type === "clarify") {
    const key = intent.reason === "location" ? "clarifyLocation" : intent.reason === "date" ? "clarifyDate" : "clarifyMachine";
    return res.json({ message: aiMessage(key, language), recommendations: [] });
  }

  if (mongoose.connection.readyState !== 1 && !["general"].includes(intent.type)) {
    return res.status(503).json({ message: aiMessage("databaseUnavailable", language) });
  }

  const currentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const messages = [
    { role: "system", content: buildAssistantSystemPrompt({ language, intent: intent.type, role, message, currentDate, pageContext }) },
    ...modelHistory(history),
    { role: "user", content: message }
  ];

  try {
    if (intent.type === "general") {
      const reply = await callGroq(messages, null);
      const text = reply.data?.choices?.[0]?.message?.content?.trim();
      const fallback = aiGeneralFallback(message, language);
      return res.json({ message: responseInCurrentStyle(reply.ok ? text : fallback, intent.type, 0, language, message), recommendations: [] });
    }

    // Role-authorized tool list
    const tools = getToolsForRole(role);
    const toolResults = [];
    let finalText = "";
    let modelFailed = false;
    let loopMessages = [...messages];
    let invokedTools = 0;

    for (let step = 0; step < 4 && invokedTools < 6; step += 1) {
      const completion = await callGroq(loopMessages, tools);
      if (!completion.ok) {
        modelFailed = true;
        break;
      }
      const assistant = completion.data?.choices?.[0]?.message;
      const calls = Array.isArray(assistant?.tool_calls) ? assistant.tool_calls.slice(0, 3) : [];
      if (!calls.length) {
        finalText = assistant?.content?.trim() || "";
        break;
      }
      loopMessages.push({ role: "assistant", content: assistant.content || null, tool_calls: calls });
      for (const call of calls) {
        if (invokedTools >= 6) break;
        const name = call.function?.name;
        let args = {};
        try { args = JSON.parse(call.function?.arguments || "{}"); } catch { args = {}; }
        console.info("AI tool call", { model: groqModel(), role, tool: name, args: safeLogArgs(args) });
        let result;
        try {
          result = await executeTool(name, args, assistantUser, { history, message });
        } catch (toolError) {
          console.error("AI tool failed", { tool: name, args: safeLogArgs(args), error: redactError(toolError.message || toolError.name || "ToolError") });
          result = { error: "The WorkShetu action failed. Please try again." };
        }
        toolResults.push({ name, args, result });
        loopMessages.push({ role: "tool", tool_call_id: call.id, name, content: JSON.stringify(result) });
        invokedTools += 1;
      }
    }

    // Intent fallbacks if model did not invoke any tool
    if (!toolResults.length) {
      const inferred = searchFilters(message, history);

      if (role === "Admin") {
        if (intent.type === "admin_stats") {
          const result = await getAdminDashboardStats({}, assistantUser);
          toolResults.push({ name: "getAdminDashboardStats", args: {}, result });
        } else if (intent.type === "admin_driver_applications") {
          const result = await getDriverApplications({ status: "Pending" }, assistantUser);
          toolResults.push({ name: "getDriverApplications", args: { status: "Pending" }, result });
        } else if (intent.type === "admin_bookings") {
          const result = await getPlatformBookings({ status: "All" }, assistantUser);
          toolResults.push({ name: "getPlatformBookings", args: { status: "All" }, result });
        } else if (intent.type === "admin_complaints") {
          const result = await getPlatformComplaints({ status: "All" }, assistantUser);
          toolResults.push({ name: "getPlatformComplaints", args: { status: "All" }, result });
        } else if (intent.type === "admin_offers") {
          const result = await getOfferAnalytics({}, assistantUser);
          toolResults.push({ name: "getOfferAnalytics", args: {}, result });
        }
      } else if (role === "Driver") {
        if (intent.type === "driver_requests") {
          const result = await getDriverRequests({ status: "Pending" }, assistantUser);
          toolResults.push({ name: "getDriverRequests", args: { status: "Pending" }, result });
        } else if (intent.type === "driver_listings") {
          const result = await getDriverListings({}, assistantUser);
          toolResults.push({ name: "getMyListings", args: {}, result });
        } else if (intent.type === "driver_earnings") {
          const result = await getDriverEarnings({}, assistantUser);
          toolResults.push({ name: "getMyEarnings", args: {}, result });
        } else if (intent.type === "driver_status") {
          const result = await getDriverProfileStatus({}, assistantUser);
          toolResults.push({ name: "getDriverProfileStatus", args: {}, result });
        }
      } else {
        // Farmer fallbacks
        if (intent.type === "nearby") {
          const rawResult = await searchMachines(inferred, assistantUser, true);
          const result = Array.isArray(rawResult)
            ? rankMachineListings(rawResult, { category: inferred.category, maxPrice: inferred.maxPrice, searchText: message, userLatitude: assistantUser.latitude, userLongitude: assistantUser.longitude })
            : rawResult;
          toolResults.push({ name: "getNearbyMachines", args: inferred, result });
        } else if (intent.type === "search") {
          const rawResult = await searchMachines(inferred, assistantUser);
          const result = Array.isArray(rawResult)
            ? rankMachineListings(rawResult, { category: inferred.category, maxPrice: inferred.maxPrice, searchText: message, userLatitude: assistantUser.latitude, userLongitude: assistantUser.longitude })
            : rawResult;
          toolResults.push({ name: "searchMachines", args: inferred, result });
        } else if (intent.type === "labour" || intent.type === "transport") {
          const tool = intent.type === "labour" ? "searchLabour" : "searchTransport";
          const rawResult = await searchDirectory(intent.type === "labour" ? "Labour" : "Transport", intent.filters || {}, assistantUser);
          const result = intent.type === "labour" && Array.isArray(rawResult)
            ? rankLabourListings(rawResult, { category: intent.filters?.labourType, maxPrice: intent.filters?.maxPrice, searchText: message, userLatitude: assistantUser.latitude, userLongitude: assistantUser.longitude })
            : rawResult;
          toolResults.push({ name: tool, args: intent.filters || {}, result });
        } else if (intent.type === "my_bookings") {
          const result = await getFarmerBookings(assistantUser, intent.status || "Active");
          toolResults.push({ name: "getMyBookings", args: { status: intent.status || "Active" }, result });
        } else if (intent.type === "group_booking") {
          const result = await getNearbyGroupBookings(assistantUser, {});
          toolResults.push({ name: "getNearbyGroupBookings", args: {}, result });
        } else if (intent.type === "farmer_offers") {
          const result = await getEligibleOffers({ serviceType: "All" }, assistantUser);
          toolResults.push({ name: "getEligibleOffers", args: { serviceType: "All" }, result });
        } else if (intent.type === "price_calculation") {
          const result = await calculateBookingPrice({ landArea: inferred.landArea || 4, category: inferred.category || "Tractor" }, assistantUser);
          toolResults.push({ name: "calculateBookingPrice", args: {}, result });
        }
      }
      modelFailed = true;
    }

    if (modelFailed || !finalText) {
      const summaries = toolResults.map(({ name, result }) => ({ tool: name, result }));
      const final = await callGroq([
        { role: "system", content: buildAssistantSystemPrompt({ language, intent: intent.type, role, message, currentDate }) },
        ...modelHistory(history),
        { role: "user", content: message },
        { role: "user", content: `Verified WorkShetu database results: ${JSON.stringify(summaries)}` }
      ], null);
      finalText = final.data?.choices?.[0]?.message?.content?.trim() || "";
    }

    const recommendations = responseRecommendations(toolResults, language);
    const directorySearch = ["search", "nearby", "labour", "transport"].includes(intent.type);
    const lookupFailed = toolResults.some((entry) => entry.result?.error);
    const hasDirectoryResult = toolResults.some((entry) => Array.isArray(entry.result));

    const responseMessage = directorySearch && lookupFailed && !recommendations.length
      ? aiMessage("requestFailed", language)
      : directorySearch && hasDirectoryResult
        ? (recommendations.length ? aiMessage("found", language, recommendations.length) : aiMessage("noResults", language))
        : responseInCurrentStyle(finalText, intent.type, recommendations.length, language, message);

    return res.json({ message: responseMessage, recommendations });
  } catch (error) {
    console.error("AI assistant request failed", { model: groqModel(), error: redactError(error.message || error.name || "RequestError") });
    return res.status(502).json({ message: aiMessage("requestFailed", language) });
  }
});

module.exports = router;
