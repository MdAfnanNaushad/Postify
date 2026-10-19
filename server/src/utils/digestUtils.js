/**
 * Digest Utilities: Deterministic ISO week boundaries & formatting
 */

/**
 * Returns the ISO 8601 week key (e.g. "2026-W42") for a given Date
 */
function getISOWeekString(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO week day: Sunday is 7, Monday is 1
  const dayNr = (target.getUTCDay() + 6) % 7;
  // Set to nearest Thursday: current date + 4 - current day number
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  const year = new Date(firstThursday).getUTCFullYear();
  const paddedWeek = String(weekNumber).padStart(2, '0');
  return `${year}-W${paddedWeek}`;
}

/**
 * Calculates deterministic UTC start (Monday 00:00:00.000) and end (Sunday 23:59:59.999) dates
 * for a given periodKey (e.g. "2026-W42") or Date object.
 */
function getWeekBounds(periodOrDate = new Date()) {
  let year, week;

  if (typeof periodOrDate === 'string' && /^\d{4}-W\d{2}$/.test(periodOrDate)) {
    const parts = periodOrDate.split('-W');
    year = parseInt(parts[0], 10);
    week = parseInt(parts[1], 10);
  } else {
    const d = periodOrDate instanceof Date ? periodOrDate : new Date(periodOrDate);
    const key = getISOWeekString(d);
    const parts = key.split('-W');
    year = parseInt(parts[0], 10);
    week = parseInt(parts[1], 10);
  }

  // Find Monday of the specified ISO week
  // Jan 4th is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = (jan4.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
  const firstMonday = new Date(Date.UTC(year, 0, 4 - dayOfWeek));

  const startDate = new Date(firstMonday.getTime() + (week - 1) * 7 * 86400000);
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(startDate.getTime() + 6 * 86400000);
  endDate.setUTCHours(23, 59, 59, 999);

  const paddedWeek = String(week).padStart(2, '0');
  const periodKey = `${year}-W${paddedWeek}`;

  const label = formatDateRange(startDate, endDate);

  return {
    periodKey,
    startDate,
    endDate,
    label
  };
}

/**
 * Formats date range as "Mon DD – Mon DD, YYYY"
 */
function formatDateRange(start, end) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = months[start.getUTCMonth()];
  const endMonth = months[end.getUTCMonth()];
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const year = end.getUTCFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

module.exports = {
  getISOWeekString,
  getWeekBounds,
  formatDateRange
};
