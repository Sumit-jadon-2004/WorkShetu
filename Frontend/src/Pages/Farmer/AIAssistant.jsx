import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  MapPin,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Tractor,
  UserCheck,
  UserRound,
  X,
  XCircle
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { api, useAuth } from "../../context/AuthContext.jsx";
import { aiAssistantMessage, detectAiLanguageStyle } from "../../utils/aiAssistantLanguage.js";

function getRoleSuggestions(role, pageContext = "general") {
  if (role === "Admin") {
    return [
      "Platform dashboard overview aur stats dikhao",
      "Pending driver applications dikhao",
      "Platform offers aur budget spent summary",
      "All platform bookings ka status kya hai?"
    ];
  }
  if (role === "Driver") {
    if (pageContext === "labour") {
      return [
        "Mujhe harvesting ke liye mazdoor chahiye",
        "Labour ka daily wage rate kya hai?",
        "Worker kaise hire karein?",
        "Tractor driver aur operator dikhao"
      ];
    }
    return [
      "Nayi incoming booking requests dikhao",
      "Meri total earnings aur payouts kitne hain?",
      "Mera driver verification status kya hai?",
      "Meri registered machines aur listings dikhao"
    ];
  }
  // Farmer / Customer based on page context
  if (pageContext === "labour") {
    return [
      "Mujhe harvesting ke liye mazdoor chahiye",
      "Labour ka per day wage rate kitna hai?",
      "Tractor driver aur operator dhoondo",
      "Worker booking kaise karein?"
    ];
  }
  if (pageContext === "machines") {
    return [
      "Mujhe 8 bigha ke liye tractor chahiye",
      "Mere plot ke liye kiraya calculate karo",
      "Tractor kal available hai kya?",
      "Rotavator aur cultivator ke rate dikhao"
    ];
  }
  return [
    "Meri booking ka kya status hai?",
    "Mujhe 8 bigha ke liye tractor chahiye",
    "Kheti ke liye skilled labour chahiye",
    "WorkShetu par koi offer ya coupon hai kya?"
  ];
}

function currentCoordinates() {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  });
}

function ActionConfirmationCard({ recommendation, onConfirm, onCancel, loading }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/60 p-3.5 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/30">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Action Confirmation Required
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
            {recommendation.summary || recommendation.message}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-amber-200/60 pt-2.5 dark:border-amber-800/40">
        <button
          type="button"
          disabled={loading}
          onClick={() => onCancel(recommendation.actionId)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm(recommendation.actionId)}
          className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500"
        >
          Confirm & Execute
        </button>
      </div>
    </div>
  );
}

function DriverRequestCard({ recommendation, onActionClick }) {
  const reqItem = recommendation.request;
  if (!reqItem) return null;
  const isPending = reqItem.status === "Pending";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
            {reqItem.type || "Fast Booking"} Request
          </span>
          <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {reqItem.service || "Machinery Request"}
          </h4>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
          isPending ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        }`}>
          {reqItem.status}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5 truncate">
          <UserRound size={13} className="text-slate-400 shrink-0" />
          <span className="truncate">किसान: <b>{reqItem.farmerName}</b></span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <Calendar size={13} className="text-slate-400 shrink-0" />
          <span>{reqItem.requiredDate || "N/A"}</span>
        </div>
      </div>

      {reqItem.farmerLocation && (
        <p className="mt-1 truncate text-xs text-slate-500">
          <MapPin size={12} className="mr-1 inline text-slate-400" />
          {reqItem.farmerLocation}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
        <div>
          <span className="text-[10px] text-slate-500">Driver Payout: </span>
          <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{reqItem.driverPayout}</span>
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onActionClick(`Reject booking request ${reqItem.bookingId}`)}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => onActionClick(`Accept booking request ${reqItem.bookingId}`)}
              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OfferCard({ recommendation }) {
  const o = recommendation.offer;
  if (!o) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-xs dark:border-emerald-800/50 dark:bg-emerald-950/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Tag size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span className="font-mono text-xs font-black tracking-wider text-emerald-800 dark:text-emerald-300">
            {o.code}
          </span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          {o.discount}
        </span>
      </div>
      <h4 className="mt-1 text-xs font-bold text-slate-900 dark:text-white">{o.title}</h4>
      {o.description && <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">{o.description}</p>}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-emerald-100 pt-1.5 dark:border-emerald-900/50">
        <span>Min: {o.minimumBookingAmount}</span>
        <span>Valid: {o.validUntil}</span>
      </div>
    </div>
  );
}

function DriverApplicationCard({ recommendation, onActionClick }) {
  const app = recommendation.application;
  if (!app) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Driver Application
          </span>
          <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {app.fullName}
          </h4>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          {app.status}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
        <p>Vehicle: <b>{app.vehicleType}</b> ({app.vehicleNumber})</p>
        <p>Experience: <b>{app.experience}</b> · Applied: {app.appliedDate}</p>
      </div>
      {app.status === "Pending" && (
        <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onActionClick(`Reject driver application ${app.userId}`)}
            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onActionClick(`Approve driver application ${app.userId}`)}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

function BookingCard({ recommendation }) {
  const booking = recommendation.booking;
  if (!booking) return null;
  const isAccepted = booking.status === "Accepted";
  const isPending = booking.status === "Pending";
  const isRejected = booking.status === "Rejected" || booking.status === "Cancelled";
  const isCompleted = booking.status === "Completed";

  const statusBadge = isAccepted ? (
    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
      <CheckCircle2 size={12} /> Accepted
    </span>
  ) : isRejected ? (
    <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
      <XCircle size={12} /> Rejected
    </span>
  ) : isCompleted ? (
    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
      <CheckCircle2 size={12} /> Completed
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      <Clock size={12} /> Pending
    </span>
  );

  return (
    <div className={`overflow-hidden rounded-2xl border transition shadow-xs ${
      isAccepted ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20" : 
      isRejected ? "border-slate-200 bg-slate-50/70 opacity-90 dark:border-slate-700 dark:bg-slate-900/40" :
      "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
    }`}>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
              {booking.type || "Machine Booking"}
            </span>
            <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {booking.service || booking.machine || "Agricultural Service"}
            </h4>
          </div>
          {statusBadge}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <UserRound size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">ड्राइवर: <b>{booking.driverName || "Driver"}</b></span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>{booking.date || "N/A"}</span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <div>
            <span className="text-[10px] text-slate-500">किराया: </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">{booking.totalPrice || booking.myFinalPrice || "N/A"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isAccepted && booking.driverPhone && (
              <a
                href={`tel:${booking.driverPhone}`}
                className="flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 transition hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
              >
                <Phone size={11} /> Call
              </a>
            )}
            <Link
              to="/bookings"
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              My Bookings
            </Link>
          </div>
        </div>

        {isAccepted && booking.completionOtp && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-emerald-100/80 p-2 text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              Completion OTP:
            </span>
            <span className="font-mono text-sm font-black tracking-widest bg-white px-2 py-0.5 rounded-lg shadow-xs dark:bg-slate-900">
              {booking.completionOtp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MachineCard({ recommendation }) {
  const machine = recommendation.machine;
  if (!machine) return null;
  const unavailable = recommendation.availabilityStatus === "unavailable";
  return (
    <Link to={`/machines/${recommendation.machineId}`} className="group flex overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-green-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      {machine.image?.url ? <img src={machine.image.url} alt={machine.title} className="h-24 w-24 shrink-0 object-cover sm:h-28 sm:w-28" /> : <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-green-50 text-green-800 dark:bg-green-950 sm:h-28 sm:w-28"><Tractor size={32} /></div>}
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-green-700">{machine.category}</p><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{machine.title}</h3></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${unavailable ? "bg-rose-50 text-rose-700" : "bg-green-50 text-green-800"}`}>{recommendation.availabilityLabel || "Available"}</span></div>
        <p className="mt-1 truncate text-xs text-slate-500"><MapPin size={12} className="mr-1 inline" />{machine.location}{machine.distanceKm != null ? ` · ${machine.distanceKm} km` : ""}</p>
        <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">₹{machine.price}<span className="ml-1 text-[10px] font-medium text-slate-500">/ {machine.unit}</span></p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">{machine.power && <span>{machine.power} HP</span>}{machine.averageRating && <span><Star size={11} className="mr-0.5 inline fill-amber-400 text-amber-400" />{machine.averageRating} ({machine.reviewCount})</span>}</div>
      </div>
    </Link>
  );
}

function ServiceCard({ recommendation }) {
  const service = recommendation.service;
  if (!service) return null;
  const isLabour = service.serviceType === "Labour" || recommendation.type === "labour";
  const linkTo = isLabour ? `/labour/${recommendation.serviceId}` : "#";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex">
        {service.image?.url ? (
          <img src={service.image.url} alt={service.title} className="h-24 w-24 shrink-0 object-cover sm:h-28 sm:w-28" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-emerald-50 text-emerald-800 dark:bg-emerald-950 sm:h-28 sm:w-28">
            <HardHat size={30} />
          </div>
        )}
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {service.category || service.serviceType}
            </span>
            {recommendation.reason && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 truncate max-w-[120px]">
                {recommendation.reason}
              </span>
            )}
          </div>
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white mt-0.5">{service.title}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">
            <MapPin size={12} className="mr-1 inline text-slate-400" />
            {service.location}{service.distanceKm != null ? ` · ${service.distanceKm} km` : ""}
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">₹{service.price}</span>
            <span className="text-[10px] text-slate-500">/ {service.pricingUnit || "day"}</span>
            {service.experience != null && (
              <span className="ml-2 text-[10px] text-slate-500 font-semibold">({service.experience} yrs exp)</span>
            )}
          </div>
        </div>
      </div>
      {isLabour && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <Link
            to={linkTo}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-2xs"
          >
            View Profile & Book
          </Link>
        </div>
      )}
    </article>
  );
}

function ChatMessages({ messages, loading, messagesEndRef, onSuggestion, onConfirmAction, onCancelAction, role, pageContext = "general" }) {
  const suggestions = getRoleSuggestions(role, pageContext);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
      {messages.length === 0 ? (
        <div className="py-3">
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-green-50 p-3.5 dark:bg-green-950/50">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-green-800 shadow-sm dark:bg-slate-900 dark:text-green-300">
              <Sparkles size={17} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {role === "Admin" ? "WorkShetu Admin Co-Pilot" : role === "Driver" ? "WorkShetu Driver Co-Pilot" : "WorkShetu Sahayak"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {role === "Admin"
                  ? "Monitor operations, driver applications, complaints, and promotional campaigns."
                  : role === "Driver"
                    ? "Manage incoming requests, track payouts & earnings, and verify completion OTPs."
                    : "Find farm machines, check booking status, pool land for discounts, or calculate prices."}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion(suggestion)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-medium text-slate-600 transition hover:border-green-400 hover:bg-green-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-green-950"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((item, index) => (
          <div key={`${index}-${item.role}`} className={`flex gap-2.5 ${item.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              item.role === "user" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200" : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            }`}>
              {item.role === "user" ? <UserRound size={15} /> : <Bot size={16} />}
            </span>
            <div className={`max-w-[86%] min-w-0 ${item.role === "user" ? "text-right" : ""}`}>
              <p className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 ${
                item.role === "user" ? "rounded-tr-md bg-green-700 text-white" : "rounded-tl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              }`}>
                {item.content || item.message}
              </p>
              {item.recommendations?.length > 0 && (
                <div className="mt-2 grid gap-2">
                  {item.recommendations.map((recommendation, rIdx) => {
                    if (recommendation.type === "action_confirmation") {
                      return (
                        <ActionConfirmationCard
                          key={recommendation.actionId || rIdx}
                          recommendation={recommendation}
                          onConfirm={onConfirmAction}
                          onCancel={onCancelAction}
                          loading={loading}
                        />
                      );
                    }
                    if (recommendation.type === "driver_request") {
                      return (
                        <DriverRequestCard
                          key={recommendation.bookingId || rIdx}
                          recommendation={recommendation}
                          onActionClick={onSuggestion}
                        />
                      );
                    }
                    if (recommendation.type === "offer") {
                      return (
                        <OfferCard
                          key={recommendation.offerId || rIdx}
                          recommendation={recommendation}
                        />
                      );
                    }
                    if (recommendation.type === "driver_application") {
                      return (
                        <DriverApplicationCard
                          key={recommendation.applicationId || rIdx}
                          recommendation={recommendation}
                          onActionClick={onSuggestion}
                        />
                      );
                    }
                    if (recommendation.type === "booking") {
                      return <BookingCard key={recommendation.bookingId || rIdx} recommendation={recommendation} />;
                    }
                    if (recommendation.type === "labour" || recommendation.type === "transport") {
                      return <ServiceCard key={`${recommendation.type}-${recommendation.serviceId || rIdx}`} recommendation={recommendation} />;
                    }
                    return <MachineCard key={recommendation.machineId || rIdx} recommendation={recommendation} />;
                  })}
                </div>
              )}
            </div>
          </div>
        ))
      )}
      {loading && (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
            <Bot size={16} />
          </span>
          <span className="flex items-center gap-1">Consulting WorkShetu Co-Pilot<span className="animate-pulse">…</span></span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default function AIAssistant({ pageMode = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(pageMode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = Boolean(user?.isAdmin) || userRole === "admin";
  const isDriver = !isAdmin && userRole === "driver";
  const role = isAdmin ? "Admin" : isDriver ? "Driver" : "Farmer";

  // Derive explicit, normalized page context from URL pathname
  const currentPath = (location.pathname || "").toLowerCase();
  const pageContext = currentPath.startsWith("/machine")
    ? "machines"
    : (currentPath.startsWith("/labour") || currentPath.startsWith("/labours"))
      ? "labour"
      : "general";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, open]);

  async function sendMessage(value = input, actionPayload = null) {
    const text = typeof value === "string" ? value.trim() : "";
    if ((!text && !actionPayload) || loading) return;
    const language = detectAiLanguageStyle(text || "");
    setInput("");
    setError("");

    if (text) {
      setMessages((current) => [...current, { role: "user", content: text }]);
    }
    setLoading(true);

    try {
      const history = messages.slice(-10).map((item) => ({
        role: item.role,
        content: item.content || item.message || "",
        recommendations: item.role === "assistant" ? (item.recommendations || []).map((recommendation) => ({
          type: recommendation.type,
          machineId: recommendation.machineId,
          machine: { title: recommendation.machine?.title, category: recommendation.machine?.category },
          serviceId: recommendation.serviceId,
          service: recommendation.service ? { _id: recommendation.service._id, serviceType: recommendation.service.serviceType, title: recommendation.service.title, category: recommendation.service.category } : undefined,
        })) : [],
      }));

      const asksNearby = /\b(?:nearby|near\s+me|around\s+me|my\s+(?:area|location))\b|mere\s+(?:aas\s+paas|paas\s+(?:tractor|harvester|machine)|location)|aas\s+paas|मेरे\s+(?:आस\s+पास|पास)|आस\s+पास/i.test(text);
      const coordinates = asksNearby ? await currentCoordinates() : null;

      const payload = actionPayload ? { ...actionPayload, pageContext } : {
        message: text,
        history,
        pageContext,
        ...(coordinates ? { currentCoordinates: coordinates } : {}),
      };

      const response = await api.post("/ai/assistant", payload);
      setMessages((current) => [...current, { role: "assistant", ...response.data }]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || aiAssistantMessage("networkError", language));
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmAction(actionId) {
    sendMessage("", { actionId, confirm: true });
  }

  function handleCancelAction(actionId) {
    sendMessage("", { actionId, cancel: true });
  }

  const assistantTitle = role === "Admin"
    ? "WorkShetu Admin Co-Pilot"
    : role === "Driver"
      ? (pageContext === "labour" ? "WorkShetu Labour Advisor" : "WorkShetu Driver Co-Pilot")
      : (pageContext === "labour" ? "WorkShetu Labour Sahayak" : "WorkShetu Sahayak");

  const assistantSubtitle = role === "Admin"
    ? "Operations & Verification"
    : role === "Driver"
      ? (pageContext === "labour" ? "Browse Skilled Labour & Workers" : "Requests, Earnings & Listings")
      : (pageContext === "labour" ? "Skilled Farm Labour & Workers" : pageContext === "machines" ? "Farm Machinery & Implements" : "Agricultural Services & Bookings");

  const chat = (
    <>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-emerald-500 text-white shadow-sm">
          <Bot size={21} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{assistantTitle}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 truncate">
            <Check size={12} className="text-green-600 shrink-0" />
            {assistantSubtitle}
          </p>
        </div>
        {!pageMode && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Minimize assistant"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>

      <ChatMessages
        messages={messages}
        loading={loading}
        messagesEndRef={messagesEndRef}
        onSuggestion={(suggestion) => { setInput(suggestion); setOpen(true); }}
        onConfirmAction={handleConfirmAction}
        onCancelAction={handleCancelAction}
        role={role}
        pageContext={pageContext}
      />

      {error && (
        <p role="alert" className="mx-4 mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {error}
        </p>
      )}

      <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-green-950">
          <textarea
            rows="1"
            maxLength={1200}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              role === "Admin"
                ? "Ask about platform stats, driver applications, complaints…"
                : role === "Driver"
                  ? "Ask about your booking requests, earnings, listings…"
                  : "Ask about tractors, pricing, booking status, offers…"
            }
            aria-label="Ask WorkShetu AI Co-Pilot"
            className="max-h-24 min-h-10 flex-1 resize-y bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white transition hover:bg-green-800 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Real WorkShetu data & protected transactions · Powered by AI
        </p>
      </form>
    </>
  );

  if (pageMode) {
    return (
      <div className="min-h-screen bg-[#f6f8f3] dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <section className="flex h-[min(78vh,48rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {chat}
          </section>
        </main>
      </div>
    );
  }

  // Floating widget available for all logged-in roles (Farmer, Driver, Admin)
  if (!user || location.pathname === "/assistant") return null;

  return (
    <div data-floating-ai="true" className="group fixed bottom-4 right-4 z-[130] flex flex-col items-end gap-3 overflow-visible sm:bottom-36 sm:right-0">
      {open && (
        <section
          aria-label="WorkShetu AI assistant"
          className="flex h-[min(72vh,calc(100dvh-17rem),42rem)] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
        >
          {chat}
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close WorkShetu assistant" : "Open WorkShetu assistant"}
        className="flex h-12 w-12 translate-x-0 items-center justify-center rounded-full bg-gradient-to-r from-green-800 to-green-700 p-0 text-white shadow-xl shadow-green-900/25 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-green-200 dark:focus:ring-green-950 sm:h-auto sm:w-auto sm:justify-start sm:gap-2.5 sm:rounded-l-full sm:rounded-r-none sm:px-4 sm:py-3 sm:translate-x-[calc(100%-24px)] sm:group-hover:translate-x-0 sm:group-focus-within:translate-x-0"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          {open ? <X size={18} /> : <Sparkles size={18} />}
        </span>
        <span className="hidden pr-1 text-sm font-bold sm:inline">
          {open ? "Close assistant" : "Ask WorkShetu"}
        </span>
      </button>
    </div>
  );
}
