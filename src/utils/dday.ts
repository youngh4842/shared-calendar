const SEOUL_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 86_400_000;

export function getSeoulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyToEpochDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function getDDayLabel(targetDate: string, today = getSeoulDate()) {
  const difference = dateKeyToEpochDay(targetDate) - dateKeyToEpochDay(today);
  if (difference === 0) return "D-Day";
  return difference > 0 ? `D-${difference}` : `D+${Math.abs(difference) + 1}`;
}
