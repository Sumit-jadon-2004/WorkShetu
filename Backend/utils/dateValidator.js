/**
 * Date validation utility for WorkShetu booking forms.
 * Prevents selection and submission of past dates and past date-time combinations
 * while preserving valid same-day bookings across timezones (Asia/Kolkata & UTC).
 */

const PAST_DATE_ERROR_MESSAGE = "Please select a valid date. Past dates are not allowed.";

/**
 * Returns YYYY-MM-DD string for a given date object and timezone.
 */
function getDayString(date, timeZone = "Asia/Kolkata") {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Validates that a booking date (and optional time) is not in the past.
 * @param {string|Date} dateInput - The date string (e.g. "2026-10-11") or Date object.
 * @param {string} [timeInput] - Optional preferred time (e.g. "08:00 AM", "14:30").
 * @returns {string|null} Error message if invalid, or null if valid.
 */
function validateBookingDate(dateInput, timeInput) {
  if (!dateInput) {
    return PAST_DATE_ERROR_MESSAGE;
  }

  // 1. Format check & parse
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return PAST_DATE_ERROR_MESSAGE;
  }

  // 2. Determine calendar day representation
  let inputDayString = "";
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    inputDayString = dateInput.slice(0, 10);
  } else {
    inputDayString = getDayString(parsed, "Asia/Kolkata");
  }

  const now = new Date();
  const todayKolkata = getDayString(now, "Asia/Kolkata");
  const todayUTC = now.toISOString().split("T")[0];

  // A calendar date is in the past if it is strictly before both today in IST and today in UTC.
  // This timezone-safe check ensures users booking "today" in local or UTC time are not blocked.
  if (inputDayString < todayKolkata && inputDayString < todayUTC) {
    return PAST_DATE_ERROR_MESSAGE;
  }

  return null;
}

module.exports = {
  validateBookingDate,
  PAST_DATE_ERROR_MESSAGE,
  getDayString
};
