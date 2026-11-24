const mongoose = require("mongoose");

const CATEGORY_PATTERNS = [
  ["Tractor", /\btract(?:or|er|ar)s?\b|\btraktr\b|\u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930/i],
  ["Cultivator", /\bcultivator\b|\u0915\u0932\u094d\u091f\u0940\u0935\u0947\u091f\u0930/i],
  ["Rotavator", /\brotavator\b|\u0930\u094b\u091f\u093e\u0935\u0947\u091f\u0930/i],
  ["Harrow", /\bharrow\b|\u0939\u0948\u0930\u094b/i],
  ["Harvester", /\bharvester\b|\bcombine\b|\u0939\u093e\u0930\u094d\u0935\u0947\u0938\u094d\u091f\u0930/i]
];
const NATIVE_CATEGORY_PATTERNS = CATEGORY_PATTERNS.map(([category, pattern]) => [category, pattern]);
const GENERAL_PATTERNS = [
  /^(?:h+i+|hello|hey|namaste|namaskar|\u0939\u0947\u0932\u094b|\u0928\u092e\u0938\u094d\u0924\u0947|\u0928\u092e\u0938\u094d\u0915\u093e\u0930)[!?.\s]*$/iu,
  /^(?:(?:app|aap|tum|you)\s+(?:kon|kaun|who)\s+(?:ho|are\s+you)?|\u0906\u092a\s+\u0915\u094c\u0928\s+\u0939\u094b)[?!?.\s]*$/iu,
  /^(?:(?:tum|aap|you)\s+(?:kya|what)\s+(?:kar|can\s+you\s+do|help)[^?!.]*|\u0906\u092a\s+\u0915\u094d\u092f\u093e\s+\u0915\u0930\s+\u0938\u0915\u0924\u0947\s+\u0939\u0948\u0902?)[?!?.\s]*$/iu,
  /^(?:kaise\s+ho|how\s+are\s+you|work?shetu\s+kya\s+hai|what\s+is\s+workshetu|\u0915\u0948\u0938\u0947\s+\u0939\u094b|\u0935\u0930\u094d\u0915\u0938\u0947\u0924\u0941\s+\u0915\u094d\u092f\u093e\s+\u0939\u0948)[?!?.\s]*$/iu,
  /^(?:thanks?|thank\s+you|shukriya|\u0927\u0928\u094d\u092f\u0935\u093e\u0926)[!?.\s]*$/iu
];

function categoryInText(text = "") {
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).flatMap((entry) => {
    if (!entry || !["user", "assistant"].includes(entry.role)) return [];
    const content = typeof entry.content === "string" ? entry.content.trim().slice(0, 1000) : "";
    const recommendations = Array.isArray(entry.recommendations)
      ? entry.recommendations.slice(0, 6).flatMap((recommendation) => {
          const machine = recommendation?.machine;
          const machineId = String(recommendation?.machineId || machine?._id || "");
          if (!mongoose.isValidObjectId(machineId)) return [];
          return [{ machineId, title: String(machine?.title || "").slice(0, 120), category: String(machine?.category || "").slice(0, 40) }];
        })
      : [];
    const services = Array.isArray(entry.recommendations)
      ? entry.recommendations.slice(0, 6).flatMap((recommendation) => {
          const service = recommendation?.service;
          const serviceId = String(recommendation?.serviceId || service?._id || "");
          const serviceType = String(service?.serviceType || recommendation?.type || "").toLowerCase();
          if (!mongoose.isValidObjectId(serviceId) || !["labour", "transport"].includes(serviceType)) return [];
          return [{ serviceId, serviceType, title: String(service?.title || "").slice(0, 120), category: String(service?.category || "").slice(0, 80) }];
        })
      : [];
    if (!content && !recommendations.length && !services.length) return [];
    return [{ role: entry.role, content, recommendations, services }];
  });
}

function knownMachineIds(message, history) {
  const ids = new Set();
  const source = `${message || ""} ${history.filter((entry) => entry.role === "user").map((entry) => entry.content).join(" ")}`;
  for (const match of source.matchAll(/(?:\/machines\/)?\b[a-f\d]{24}\b/gi)) ids.add(match[0].replace("/machines/", ""));
  for (const entry of history) for (const item of entry.recommendations) ids.add(item.machineId);
  return [...ids];
}

function searchFilters(message, history) {
  const earlierUserText = history.filter((entry) => entry.role === "user").map((entry) => entry.content).join(" ");
  const context = `${earlierUserText} ${message}`.trim();
  const args = {};
  args.category = categoryInText(message) || categoryInText(earlierUserText);

  const areaPattern = /(\d+(?:\.\d+)?)\s*(bigha|\u092c\u0940\u0918\u093e|acres?|\u090f\u0915\u0921\u093c?|hectares?|\u0939\u0947\u0915\u094d\u091f\u0947\u092f\u0930)/iu;
  const areaMatch = message.match(areaPattern) || context.match(areaPattern);
  if (areaMatch) {
    args.landArea = Number(areaMatch[1]);
    args.areaUnit = /acre|\u090f\u0915\u0921\u093c?/iu.test(areaMatch[2]) ? "Acre" : /hectare|\u0939\u0947\u0915\u094d\u091f\u0947\u092f\u0930/iu.test(areaMatch[2]) ? "Hectare" : "Bigha";
  }

  const cityPattern = /([\p{L}][\p{L}\p{M} .'-]{1,35}?)\s+(?:ke\s+paas|me(?:in)?|mein|\u0915\u0947\s+\u092a\u093e\u0938|\u092e\u0947\u0902)(?=$|[\s,.!?])/iu;
  const explicitNear = /(?:near|around|\u0915\u0947\s+\u092a\u093e\u0938)\s+([\p{L}][\p{L} .'-]{1,35}?)(?=\s+(?:for|within|under|cheap|sasta|chahiye|available|tractor|harvester|cultivator|rotavator|harrow|dikhao|show|\u091a\u093e\u0939\u093f\u090f|\u0926\u093f\u0916\u093e\u0913)\b|[,.!?]|$)/iu;
  const englishLocation = /\b(?:near|around|in)\s+([\p{L}][\p{L} .'-]{1,35}?)(?=\s+(?:for|within|under|cheap|sasta|chahiye|available|tractor|harvester|cultivator|rotavator|harrow|dikhao|show)\b|[,.!?]|$)/iu;
  const currentLocation = message.match(cityPattern) || message.match(explicitNear) || message.match(englishLocation);
  const previousLocation = earlierUserText.match(cityPattern) || earlierUserText.match(explicitNear) || earlierUserText.match(englishLocation);
  const locationMatch = currentLocation || previousLocation;
  if (locationMatch) {
    const location = locationMatch[1].trim()
      .replace(/\b(?:tractor|cultivator|rotavator|harrow|harvester|machine|machinery|sasta|sasti|saste|cheap|cheapest|dikhao|show|find|search)\b/gi, " ")
      .replace(/\s+/g, " ").trim();
    if (location) args.location = location.slice(0, 100);
  }

  const scaleWords = "lakh|lac|lakhs|lacs|k|thousand|hazar|hazaar|\\u0932\\u093e\\u0916|\\u0939\\u091c\\u093c?\\u093e\\u0930";
  const amountPattern = new RegExp(`(?:under|below|within|upto|up\\s+to|max(?:imum)?|budget(?:\\s+of)?|ke\\s+andar|\\u0915\\u0947\\s+\\u0905\\u0902\\u0926\\u0930)\\s*(?:\\u20b9|rs\\.?\\s*)?(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${scaleWords})?`, "iu");
  const amountEndPattern = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${scaleWords})?\\s*(?:rupees?|\\u0930\\u0941\\u092a\\u092f\\u0947|\\u0930\\u0941|tak|\\u0924\\u0915|ke\\s+andar|\\u0915\\u0947\\s+\\u0905\\u0902\\u0926\\u0930|budget|ka\\s+budget)`, "iu");
  const rupeePattern = new RegExp(`(?:\\u20b9|rs\\.?\\s*)(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${scaleWords})?`, "iu");
  const currentBudget = message.match(amountPattern) || message.match(amountEndPattern) || message.match(rupeePattern);
  const contextBudget = context.match(amountPattern) || context.match(amountEndPattern) || context.match(rupeePattern);
  const budgetMatch = currentBudget || contextBudget;
  if (budgetMatch) {
    const scaleToken = String(budgetMatch[2] || "");
    const lakhScale = /^(?:lakh|lac|lakhs|lacs|लाख)$/iu;
    const thousandScale = /^(?:k|thousand|hazar|hazaar|हजार|हज़ार)$/iu;
    const scale = lakhScale.test(scaleToken) ? 100000 : thousandScale.test(scaleToken) ? 1000 : 1;
    args.maxPrice = Number(budgetMatch[1].replace(/,/g, "")) * scale;
  } else if (/^\s*\d[\d,]*(?:\s*(?:tak|\u0924\u0915|lakh|lac|hazar|hazaar|k|thousand))?\s*$/iu.test(message) && categoryInText(earlierUserText)) {
    const amount = message.match(/[\d,]+(?:\.\d+)?/)?.[0] || "0";
    const scale = /\b(?:lakh|lac)\b/i.test(message) ? 100000 : /\b(?:hazar|hazaar|k|thousand)\b/i.test(message) ? 1000 : 1;
    args.maxPrice = Number(amount.replace(/,/g, "")) * scale;
  }

  const makeMatch = context.match(/\b(john\s+deere|mahindra|swaraj|sonalika|eicher|massey\s+ferguson|new\s+holland)\b/i);
  if (makeMatch) args.searchText = makeMatch[1];
  const powerMatch = context.match(/\b(\d{2,3})\s*(?:hp|horsepower)\b|\b(\d{2,3})\s*\u090f\u091a\u092a\u0940\b/iu);
  if (powerMatch) args.power = Number(powerMatch[1] || powerMatch[2]);
  const distanceMatch = message.match(/(\d+)\s*km\b/i);
  if (distanceMatch) args.radiusKm = Math.min(Math.max(Number(distanceMatch[1]), 1), 200);

  if (/\b(tomorrow|kal)\b/i.test(context)) args.availableOn = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + 86400000));
  else if (/\b(today|aaj)\b/i.test(context)) args.availableOn = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  else {
    const explicitDate = context.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?\b/i);
    if (explicitDate) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const month = months.indexOf(explicitDate[2].slice(0, 3).toLowerCase());
      const todayText = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      let year = Number(explicitDate[3] || todayText.slice(0, 4));
      let candidate = new Date(Date.UTC(year, month, Number(explicitDate[1])));
      if (!explicitDate[3] && candidate < new Date(`${todayText}T00:00:00Z`)) candidate = new Date(Date.UTC(++year, month, Number(explicitDate[1])));
      args.availableOn = candidate.toISOString().slice(0, 10);
    }
  }
  args.preferLowPrice = /\b(cheap|cheaper|cheapest|sasta|sasti|saste|kam\s+daam|low\s+price)\b|\u0938\u0938\u094d\u0924\u093e|\u0938\u0938\u094d\u0924\u0940/iu.test(context);
  return args;
}

function serviceSearchFilters(type, message, history) {
  const machineFilters = searchFilters(message, history);
  const args = {};
  for (const key of ["location", "radiusKm", "maxPrice", "preferLowPrice"]) {
    if (machineFilters[key] !== undefined) args[key] = machineFilters[key];
  }
  const context = `${history.filter((entry) => entry.role === "user").map((entry) => entry.content).join(" ")} ${message}`;
  if (type === "labour") {
    const labourTypes = [
      ["Tractor Driver", /\btractor\s+driver\b/i], ["Harvester Operator", /\bharvester\s+operator\b/i],
      ["Loader Operator", /\bloader\s+operator\b/i], ["Truck Driver", /\btruck\s+driver\b/i],
      ["Farm Worker", /\b(?:farm\s+worker|farm\s+labou?r|agricultural\s+worker|agricultural\s+labour|kheti\s+labour|kheti\s+ke\s+liye\s+mazdoor)\b|\u0915\u093f\u0938\u093e\u0928\s+\u092e\u091c\u0926\u0942\u0930|\u092e\u091c\u0926\u0942\u0930/iu],
      ["Beldar", /\bbeldar\b|\u092c\u0947\u0932\u0926\u093e\u0930/iu],
      ["Mason", /\bmistri\b|\u092e\u093f\u0938\u094d\u0924\u094d\u0930\u0940|\b(?:construction|masonry)\b/i],
      ["Electrician", /\belectrician\b|\u0907\u0932\u0947\u0915\u094d\u091f\u094d\u0930\u0940\u0936\u093f\u092f\u0928/iu],
      ["Mechanical", /\bmechanic(?:al)?\b|\u092f\u0902\u0924\u094d\u0930\u093f\u0915|\u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930\s+\u092e\u0947\u0915\u0947\u0928\u093f\u0915/iu],
      ["Welder", /\bwelder\b|\u0935\u0947\u0932\u094d\u0921\u0930/iu],
      ["Plumber", /\bplumber\b|\u092a\u094d\u0932\u092c\u0930/iu],
      ["Carpenter", /\bcarpenter\b|\u092c\u0922\u093c\u0908/iu],
      ["Painter", /\bpainter\b|\u0930\u0902\u0917\u0938\u093e\u091c\u093c/iu],
      ["Helper", /\bhelper\b/i],
      ["Irrigation Technician", /\birrigation\s+technician\b/i],
      ["Spray Machine Operator", /\bspray\s+machine\s+operator\b/i],
      ["Engineer", /\bengineer\b|\u0907\u0902\u091c\u0940\u0928\u093f\u092f\u0930/iu]
    ];
    const match = labourTypes.find(([, pattern]) => pattern.test(context));
    if (match) args.labourType = match[0];
    else if (/\b(labou?r|worker|operator|mazdoor)\b|\u092e\u091c\u0926\u0942\u0930|\u0932\u0947\u092c\u0930/iu.test(context)) args.searchText = /worker|mazdoor|\u092e\u091c\u0926\u0942\u0930/iu.test(context) ? "Farm Worker" : "";
  } else {
    const vehicleTypes = [["Mini Truck", /\bmini\s+truck\b/i], ["Pickup", /\bpickup\b|\u092a\u093f\u0915\u0905\u092a/iu], ["Truck", /\btruck\b|\u091f\u094d\u0930\u0915/iu], ["Loader", /\bloader\b|\u0932\u094b\u0921\u0930/iu], ["Tempo", /\btempo\b|\u091f\u0947\u092e\u094d\u092a\u094b/iu]];
    const match = vehicleTypes.find(([, pattern]) => pattern.test(context));
    if (match) args.vehicleType = match[0];
  }
  return args;
}

function detectIntent(message, history, user, pageContext = "general") {
  const trimmed = message.trim();
  const lower = trimmed.toLocaleLowerCase();
  const previousUsers = history.filter((entry) => entry.role === "user").map((entry) => entry.content).join(" ");
  const knownIds = knownMachineIds(trimmed, history);
  const previousCategory = categoryInText(previousUsers) || history.flatMap((entry) => entry.recommendations || []).map((item) => item.category).map(categoryInText).find(Boolean);
  const previousServiceType = history.flatMap((entry) => entry.services || []).map((service) => service.serviceType).find((type) => ["labour", "transport"].includes(type));
  const followUp = /^(?:koi\s+(?:aur|or)|aur\s+(?:dikhao|batao)|sasta\s+(?:wala|wali|one)?|cheaper|cheapest|any\s+others?|another\b|more\b|jo\s+pehle|iske\s+alawa|\u0915\u094b\u0908\s+(?:\u0914\u0930|\u0926\u0942\u0938\u0930\u093e)|\u0914\u0930\s+\u0926\u093f\u0916\u093e|\u0907\u0938\u0915\u0947\s+\u0905\u0932\u093e\u0935\u093e)|\b(?:bhi|wala|wali)\b/iu.test(trimmed);
  const continuation = history.length > 0 && (Boolean(previousCategory) && /^(?:under|below|within|upto|up\s+to|\d|\u20b9|rs\.?|[\p{L}][\p{L} .'-]{2,35}\s+(?:ke\s+paas|me(?:in)?|mein|\u0915\u0947\s+\u092a\u093e\u0938|\u092e\u0947\u0902)|near\s+|nearby\b|.*\bnearby\s+bhi\b)/iu.test(trimmed) || followUp && Boolean(previousCategory));
  if (!continuation && GENERAL_PATTERNS.some((pattern) => pattern.test(trimmed))) return { type: "general" };
  if (!continuation && /^(?:who\s+are\s+you|what\s+can\s+you\s+do|what\s+is\s+workshetu|work?shetu\s+kya\s+hai|tum\s+kya\s+kar\s+sakte\s+ho|aap\s+kya\s+kar\s+sakte\s+ho)\b/i.test(lower)) return { type: "general" };

  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = user?.isAdmin === true || userRole === "admin";
  const isDriver = !isAdmin && userRole === "driver";

  // Admin intents
  if (isAdmin) {
    if (/\b(stats|dashboard|metrics|overview|platform\s+summary|platform\s+volume)\b|\u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921/iu.test(trimmed)) {
      return { type: "admin_stats" };
    }
    if (/\b(driver\s+applications?|pending\s+drivers?|verify\s+drivers?|driver\s+requests?)\b|\u0921\u094d\u0930\u093e\u0907\u0935\u0930\s+\u0906\u0935\u0947\u0926\u0928/iu.test(trimmed)) {
      return { type: "admin_driver_applications" };
    }
    if (/\b(all\s+bookings|platform\s+bookings|saari\s+bookings)\b|\u092a\u094d\u0932\u0947\u091f\u092b\u0949\u0930\u094d\u092e\s+\u092c\u0941\u0915\u093f\u0902\u0917/iu.test(trimmed)) {
      return { type: "admin_bookings" };
    }
    if (/\b(complaints?|disputes?|issues?|shikayat(?:ein)?)\b|\u0936\u093f\u0915\u093e\u092f\u0924/iu.test(trimmed)) {
      return { type: "admin_complaints" };
    }
    if (/\b(offers?|campaigns?|promotions?|discounts?|budget|budget\s+spent)\b|\u0911\u092b\u0930/iu.test(trimmed)) {
      return { type: "admin_offers" };
    }
  }

  // Driver intents
  if (isDriver) {
    if (/\b(?:requests?|incoming|driver\s+requests?)\b|\b(?:meri|my|nayi)\b.{0,25}\b(?:requests?|bookings?)\b|\u0930\u093f\u0915\u094d\u0935\u0947\u0938\u094d\u091f/iu.test(trimmed)) {
      return { type: "driver_requests" };
    }
    if (/\b(?:(?:my|meri|apni|show|registered)\s+.*(?:machines?|listings?|tractors?|equipment|gadi)|my\s+listings?|meri\s+listings?|registered\s+machines?)\b|\b(?:meri|my)\b.{0,25}\b(?:machines?|equipment|listings?)\b|\u092e\u0947\u0930\u0940\s+\u0932\u093f\u0938\u094d\u091f\u093f\u0902\u0917|\u092e\u0947\u0930\u0940\s+\u092e\u0936\u0940\u0928/iu.test(trimmed)) {
      return { type: "driver_listings" };
    }
    if (/\b(earnings?|kamai|payouts?|mera\s+payout|meri\s+kamai|kitne\s+paise)\b|\u0915\u092e\u093e\u0908/iu.test(trimmed)) {
      return { type: "driver_earnings" };
    }
    if (/\b(profile\s+status|account\s+status|driver\s+status|mera\s+status|verification\s+status|approval\s+status)\b|\u0938\u094d\u091f\u0947\u091f\u0938/iu.test(trimmed)) {
      return { type: "driver_status" };
    }
  }

  // Universal Labour search intent: Works for Farmers, Drivers, Labour, and all users
  const workerWords = /\b(?:labou?r|worker|mistri|mason|engineer|technician|mechanic|electrician|plumber|carpenter|painter|beldar|mazdoor|kheti\s+mazdoor|kheti\s+labour)\b|\u092e\u091c\u0926\u0942\u0930|\u092c\u0947\u0932\u0926\u093e\u0930|\u092e\u093f\u0938\u094d\u0924\u094d\u0930\u0940|\u0932\u0947\u092c\u0930/iu.test(trimmed);
  const searchWords = /\b(?:need|find|search|show|want|hire|looking\s+for|chahiye|dikhao|dhundo|dhoondo|mujhe|list)\b|\u091a\u093e\u093f\u090f|\u0926\u093f\u0916\u093e\u0913|\u0922\u0942\u0902\u0922\u094b/iu.test(trimmed);
  if (workerWords && (searchWords || pageContext === "labour" || /\bmistri|mazdoor|\u092e\u091c\u0926\u0942\u0930|\u092e\u093f\u0938\u094d\u0924\u094d\u0930\u0940/iu.test(trimmed))) {
    return { type: "labour", filters: serviceSearchFilters("labour", trimmed, history) };
  }

  // Labour role intents (Profile, requests, registrations)
  const isLabour = !isAdmin && !isDriver && String(user?.role || "").trim().toLowerCase() === "labour";
  if (pageContext === "labour" || isLabour) {
    const profileRequest = /\b(?:my|meri|main\s+(?:apni|meri)|mujhe\s+meri|show|dekh(?:na|ao)|dikha(?:o|na))\b.{0,35}\b(?:labour\s+)?(?:profile|listing)\b|\u092e\u0947\u0930\u0940\s+(?:labour\s+)?(?:\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932|\u0932\u093f\u0938\u094d\u091f\u093f\u0902\u0917)|\u092e\u0947\u0930\u0940\s+\u0932\u0947\u092c\u0930\s+\u0932\u093e\u0907\u0928/iu.test(trimmed);
    if (profileRequest) {
      if (/\b(?:update|edit|change|modify|badal|update\s+kar|listing\s+update)\b|\u0905\u092a\u0921\u0947\u091f|\u092c\u0926\u0932/iu.test(trimmed)) {
        return { type: "labour_profile_update" };
      }
      return { type: "labour_profile" };
    }

    const registrationRequest = /\b(?:register|registration|apply|application|enroll|join)\b.{0,20}\b(?:labour|worker|mistri|engineer|mechanic|electrician|plumber|carpenter|painter|beldar)\b|\b(?:labour|worker|mistri|engineer|mechanic|electrician|plumber|carpenter|painter|beldar)\b.{0,20}\b(?:register|registration|apply|application|kaise|kya\s+process)\b|\u0932\u0947\u092c\u0930\s+\u092e\u0947\u0902\s+\u0930\u0917\u093f\u0938\u094d\u091f\u0930|\u0930\u091c\u093f\u0938\u094d\u091f\u094d\u0930\u0947\u0936\u0928\s+\u0915\u0948\u0938\u0947/iu.test(trimmed);
    if (registrationRequest) return { type: "labour_registration" };

    const requestStatus = /\b(?:pending|accepted|rejected|completed|work\s+requests?|requests?|booking\s+requests?|jobs?)\b|\u092a\u0947\u0902\u0921\u093f\u0902\u0917|\u090f\u0915\u094d\u0938\u0947\u092a\u094d\u091f|\u0930\u093f\u091c\u0947\u0915\u094d\u091f|\u0915\u0902\u092a\u094d\u0932\u0940\u091f|\u0915\u093e\u092e\s+\u0936\u0941\u0939\u093e\u092a/iu.test(trimmed);
    const requestRequest = /\b(?:my|mere|meri|mujhe|show|dikha|dikh(?:ao|na)|view)\b.{0,35}\b(?:pending|accepted|rejected|completed|work\s+requests?|requests?|booking\s+requests?|jobs?)\b|\u092e\u0947\u0930\u0947?\s+(?:\u0915\u093e\u092e|\u0932\u0947\u092c\u0930)\s+\u0935\u0940\u092f\u094b\u091a/iu.test(trimmed);
    if (requestStatus && requestRequest) {
      let status = "All";
      if (/\bpending\b|\u092a\u0947\u0902\u0921\u093f\u0902\u0917/iu.test(trimmed)) status = "Pending";
      else if (/\baccepted\b|\u090f\u0915\u094d\u0938\u0947\u092a\u094d\u091f|\u0938\u094d\u0935\u0940\u0915\u093e\u0930/iu.test(trimmed)) status = "Accepted";
      else if (/\brejected\b|\u0930\u093f\u091c\u0947\u0915\u094d\u091f/iu.test(trimmed)) status = "Rejected";
      else if (/\b(?:completed|done)\b|\u0915\u0902\u092a\u094d\u0932\u0940\u091f|\u092a\u0942\u0930\u093e/iu.test(trimmed)) status = "Completed";
      return { type: "labour_requests", status };
    }

    const bookingGuidance = /\b(?:book(?:ing)?|hire|hiring)\b.{0,30}\b(?:labour|worker|mistri|mechanic|electrician|plumber|beldar)\b|\b(?:labour|worker)\b.{0,30}\b(?:kaise|how)\b.{0,15}\b(?:book|hire)\b|\u0915\u0948\u0938\u0947\s+\u0938\u093f\u0915\u093e/iu.test(trimmed);
    if (bookingGuidance) return { type: "labour_booking" };
  }

  // Farmer offer & calculation intents
  if (!isAdmin && !isDriver) {
    if (/\b(offers?|promotions?|discount\s+offers?|coupons?|offers\s+hai\s+kya)\b|\u0911\u092b\u0930|\u091b\u0942\u091f/iu.test(trimmed)) {
      return { type: "farmer_offers" };
    }
    if (/\b(?:calculate|estimate)\b.{0,25}\b(?:price|cost|kiraya|kharcha)\b|\b(?:price|cost|kiraya|kharcha)\b.{0,25}\b(?:calculate|estimate|batao|kitna)\b|\bkitna\s+(?:kharcha|kiraya|cost|paisa|rupaye)\b|\u0915\u093f\u0930\u093e\u092f\u093e\s+\u0915\u093f\u0924\u0928\u093e/iu.test(trimmed)) {
      return { type: "price_calculation" };
    }
  }

  const groupBookingRequest = /\b(group\s+booking|group\s+bookings|pool(?:ing)?|milkar\s+booking)\b|\bgroup\b.{0,20}\b(?:booking|machine)\b|\u0917\u094d\u0930\u0941\u092a\s+\u092c\u0941\u0915\u093f\u0902\u0917/iu.test(trimmed);
  if (groupBookingRequest) {
    return { type: "group_booking" };
  }

  const howToCancelOrBook = /\b(?:cancel|cancellation|refund|book)\b.{0,20}\b(?:kaise|how|karna|process)\b|\b(?:kaise|how)\b.{0,20}\b(?:cancel|refund|book)\b|\u0930\u0926\u094d\u0926\s+\u0915\u0948\u0938\u0947|\u0915\u0948\u0938\u0947\s+\u0930\u0926\u094d\u0926|\u092c\u0941\u0915\u093f\u0902\u0917\s+\u0915\u0948\u0938\u0947/iu.test(trimmed);
  if (howToCancelOrBook) return { type: "general", topic: "booking_question" };

  const myBookingsPattern = /\b(meri\s+booking|mere\s+orders?|my\s+bookings?|my\s+orders?|booking\s+status|order\s+status|active\s+bookings?|latest\s+booking|current\s+booking|rejected\s+(?:booking|request)s?|completed\s+(?:booking|request)s?|accepted\s+(?:booking|request)s?|pending\s+(?:booking|request)s?)\b|\b(?:status|rejected|completed|accepted|pending|reject|complete|accept)\b.{0,25}\b(?:booking|order|request)s?\b|\u092e\u0947\u0930\u0940\s+\u092c\u0941\u0915\u093f\u0902\u0917|\u092c\u0941\u0915\u093f\u0902\u0917\s+\u0938\u094d\u091f\u0947\u091f\u0938|\u0930\u093f\u091c\u0947\u0915\u094d\u091f|\u0915\u0902\u092a\u094d\u0932\u0940\u091f|\u090f\u0915\u094d\u0938\u0947\u092a\u094d\u091f|\u092a\u0947\u0902\u0921\u093f\u0902\u0917/iu.test(trimmed);
  if (myBookingsPattern) {
    let statusFilter = "Current"; // Default to current/latest booking
    if (/\b(?:rejected|reject|radd|cancel|cancelled)\b|\u0930\u093f\u091c\u0947\u0915\u094d\u091f|\u0930\u0926\u094d\u0926/iu.test(trimmed)) {
      statusFilter = "Rejected";
    } else if (/\b(?:completed|complete|pura|poora|ho\s+chuka|done)\b|\u0915\u0902\u092a\u094d\u0932\u0940\u091f|\u092a\u0942\u0930\u093e/iu.test(trimmed)) {
      statusFilter = "Completed";
    } else if (/\b(?:accepted|accept|confirm|confirmed|swikar)\b|\u090f\u0915\u094d\u0938\u0947\u092a\u094d\u091f|\u0938\u094d\u0935\u0940\u0915\u093e\u0930/iu.test(trimmed)) {
      statusFilter = "Accepted";
    } else if (/\b(?:pending|wait|waiting)\b|\u092a\u0947\u0902\u0921\u093f\u0902\u0917/iu.test(trimmed)) {
      statusFilter = "Pending";
    } else if (/\b(?:all|saari|sab|sabhi|history)\b|\u0938\u092d\u0940|\u0938\u093e\u0930\u0940|\u0938\u092c/iu.test(trimmed)) {
      statusFilter = "All";
    }
    return { type: "my_bookings", status: statusFilter };
  }

  const bookingRequest = /\b(book|reserve|cancel(?:lation)?|payment|refund)\b|\b(cancel)\b.{0,30}\b(?:tractor|machine|booking)\b|\b(?:tractor|machine|booking)\b.{0,30}\b(?:cancel|payment|refund)\b|\u092c\u0941\u0915\u093f\u0902\u0917|\u0930\u0926\u094d\u0926\s+\u0915\u0930\u0928\u093e/iu.test(trimmed);
  if (bookingRequest) return { type: "general", topic: "booking_question" };

  const labourRequest = /\b(labou?r|farm\s+worker|worker|tractor\s+driver|harvester\s+operator|loader\s+operator|truck\s+driver|electrician|mechanic|welder|plumber|helper|irrigation\s+technician|mazdoor)\b|\u092e\u091c\u0926\u0942\u0930|\u092e\u091c\u0926\u0942\u0930\u094b\u0902|\u0932\u0947\u092c\u0930/iu.test(trimmed);
  const transportRequest = /\b(transport|truck|pickup|mini\s+truck|tempo|loader)\b|\u091f\u094d\u0930\u0915|\u092a\u093f\u0915\u0905\u092a/iu.test(trimmed);
  const serviceAction = /\b(need|find|search|show|want|hire|nearby|near\s+me|around\s+me|available|chahiye|dikhao|dhundo|dhoondo|mujhe|budget|under|within|near|in|mein|me|lakh|hazar)\b|\u091a\u093e\u0939\u093f\u090f|\u0926\u093f\u0916\u093e\u0913|\u0916\u094b\u091c\u094b|\u0922\u0942\u0902\u0922\u094b/iu.test(trimmed);
  if (labourRequest && serviceAction) {
    const filters = serviceSearchFilters("labour", trimmed, history);
    const isNearby = /\bnearby\b|\bnear\s+me\b|\baround\s+me\b|\bmy\s+area\b|mere\s+(?:aas\s+paas|nearby)|\u092e\u0947\u0930\u0947\s+\u0906\u0938\s*\u092a\u093e\u0938/iu.test(trimmed);
    if (isNearby && (!Number.isFinite(user?.latitude) || !Number.isFinite(user?.longitude))) return { type: "clarify", reason: "location" };
    return { type: "labour", filters };
  }
  if (transportRequest && serviceAction) {
    const filters = serviceSearchFilters("transport", trimmed, history);
    const isNearby = /\bnearby\b|\bnear\s+me\b|\baround\s+me\b|\bmy\s+area\b|mere\s+(?:aas\s+paas|nearby)|\u092e\u0947\u0930\u0947\s+\u0906\u0938\s*\u092a\u093e\u0938/iu.test(trimmed);
    if (isNearby && (!Number.isFinite(user?.latitude) || !Number.isFinite(user?.longitude))) return { type: "clarify", reason: "location" };
    return { type: "transport", filters };
  }
  if (followUp && previousServiceType) {
    const type = previousServiceType;
    const filters = serviceSearchFilters(type, trimmed, history);
    if (/\bnearby\b|\bnear\s+me\b|\baround\s+me\b|mere\s+(?:aas\s+paas|nearby)|\u092e\u0947\u0930\u0947\s+\u0906\u0938\s*\u092a\u093e\u0938/iu.test(trimmed) && (!Number.isFinite(user?.latitude) || !Number.isFinite(user?.longitude))) return { type: "clarify", reason: "location" };
    return { type, filters };
  }

  const availability = /\b(available|availability|free|booked)\b|available\s+hai|mil(?:e|egi)?\s+kya|\u0909\u092a\u0932\u092c\u094d\u0927/iu.test(trimmed);
  const specificMachineReference = knownIds.length > 0 || /\b(this|that|ye|is)\s+(?:tractor|machine|listing)\b|\b(?:ye|is)\s+(?:tractor|machine)\b|\u092f\u0939\s+(?:\u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930|\u092e\u0936\u0940\u0928)/iu.test(trimmed);
  const details = /\b(details?|specs?|specifications?|how\s+much\s+hp|what\s+hp|what\s+is\s+(?:the\s+)?hp|tell\s+me\s+about|give\s+me\s+details)\b|kitne\s+hp|details?\s+batao|ke\s+baare\s+me|\u0915\u093f\u0924\u0928\u0947\s+\u090f\u091a\s+\u092a\u0940|\u0915\u093f\u0924\u0928\u0940\s+(?:HP|\u090f\u091a\u092a\u0940)|(?:HP|\u090f\u091a\u092a\u0940)\s+\u0915\u093f\u0924\u0928\u0940|\u091c\u093e\u0928\u0915\u093e\u0930\u0940/iu.test(trimmed);
  if (availability && !specificMachineReference && !categoryInText(trimmed) && !previousCategory) return { type: "clarify", reason: "machine" };
  if (availability && specificMachineReference) {
    if (knownIds.length !== 1) return { type: "clarify", reason: "machine" };
    if (!searchFilters(trimmed, history).availableOn) return { type: "clarify", reason: "date" };
    return { type: "availability", machineIds: knownIds };
  }
  if (details) return knownIds.length === 1 ? { type: "details", machineIds: knownIds } : { type: "clarify", reply: "Kis listing ki details chahiye? Machine card ka link ya machine ID bhej dijiye." };

  const nearby = /\bnearby\b|\bnear\s+me\b|\baround\s+me\b|mere\s+(?:aas\s+paas|nearby|location)|aas\s+paas|\bmere\s+paas\s+(?:tractor|cultivator|rotavator|harrow|harvester|machine)\b|\b\d+\s*km\s+(?:ke\s+andar|within)\b|\bwithin\s+\d+\s*km\b|\u092e\u0947\u0930\u0947\s+\u0906\u0938\s*\u092a\u093e\u0938|\u092e\u0947\u0930\u0947\s+\u092a\u093e\u0938\s+(?:\u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930|\u0915\u0932\u094d\u091f\u0940\u0935\u0947\u091f\u0930|\u0930\u094b\u091f\u093e\u0935\u0947\u091f\u0930|\u0939\u0948\u0930\u094b|\u0939\u093e\u0930\u094d\u0935\u0947\u0938\u094d\u091f\u0930|\u092e\u0936\u0940\u0928)/iu.test(trimmed);
  const machineRequest = Boolean(categoryInText(trimmed)) || /\b(machines?|machinery|agricultural\s+equipment|farm\s+equipment|tractor\s+suggest|machine\s+suggest|machine\s+chahiye)\b|\u092e\u0936\u0940\u0928/iu.test(trimmed) || continuation || followUp && Boolean(previousCategory);
  if (nearby && machineRequest) {
    const coordinates = Number.isFinite(user?.latitude) && Number.isFinite(user?.longitude);
    return coordinates ? { type: "nearby", machineIds: knownIds } : { type: "clarify", reason: "location" };
  }
  if (machineRequest || /\b(show|find|search|suggest|need|want|dikhao|chahiye)\b|\u091a\u093e\u0939\u093f\u090f|\u0926\u093f\u0916\u093e\u0913/iu.test(trimmed) && /\b(tractor|harvester|machine|equipment)\b|\u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930|\u092e\u0936\u0940\u0928/iu.test(`${trimmed} ${previousUsers}`)) return { type: "search", machineIds: knownIds };
  return { type: "general" };
}

module.exports = { CATEGORY_PATTERNS, detectIntent, knownMachineIds, sanitizeHistory, searchFilters, serviceSearchFilters };
