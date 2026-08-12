function toInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(value: Date): string {
  return toInputDate(value);
}

export function normalizeCalendarDate(value: string): string {
  const dateOnly = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return dateOnly;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toInputDate(date);
}

export function subtractOneDay(value: string): string {
  const normalized = normalizeCalendarDate(value);
  const date = new Date(`${normalized}T00:00:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() - 1);
  return toInputDate(date);
}

export function addOneDay(value: string): string {
  const normalized = normalizeCalendarDate(value);
  const date = new Date(`${normalized}T00:00:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setDate(date.getDate() + 1);
  return toInputDate(date);
}

export function isValidScheduleDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00+09:00`);
  return !Number.isNaN(date.getTime());
}

export function formatKoreaDate(value: string): string {
  const normalized = normalizeCalendarDate(value);

  if (!normalized) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium"
  }).format(new Date(`${normalized}T00:00:00+09:00`));
}

export function formatKoreaDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatKoreaDate(startDate);
  }

  return `${formatKoreaDate(startDate)} ~ ${formatKoreaDate(endDate)}`;
}
