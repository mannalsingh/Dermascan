/**
 * dateUtils.js
 *
 * Provides standardized date/time formatting in India Standard Time (IST, Asia/Kolkata).
 * Ensures timestamps stored in MongoDB as UTC are clearly rendered in IST across all UI views.
 */

/**
 * Formats an ISO / UTC timestamp string or Date object into India Standard Time (IST, Asia/Kolkata).
 *
 * Example:
 *   Input:  "2026-09-29T06:52:54.505Z"
 *   Output: "29 Sep 2026, 12:22:54 PM"
 *
 * @param {string|number|Date} dateVal - Timestamp to format
 * @param {object} [options] - Optional formatting overrides
 * @param {boolean} [options.includeSeconds=true] - Whether to include seconds (default: true)
 * @param {boolean} [options.includeWeekday=false] - Whether to include weekday (default: false)
 * @returns {string} Formatted IST date and time string, or empty string if invalid
 */
export function formatIST(dateVal, options = {}) {
  if (!dateVal) return '';
  const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(date.getTime())) return '';

  const { includeSeconds = true, includeWeekday = false } = options;

  const formatOptions = {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  if (includeSeconds) {
    formatOptions.second = '2-digit';
  }

  if (includeWeekday) {
    formatOptions.weekday = 'long';
    formatOptions.month = 'long';
  }

  let formatted = date.toLocaleString('en-IN', formatOptions);

  // Normalize "Sept" -> "Sep" and "am"/"pm" -> "AM"/"PM" to match clinical UI standard
  formatted = formatted
    .replace(/\bSept\b/g, 'Sep')
    .replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());

  return formatted;
}

export default formatIST;
