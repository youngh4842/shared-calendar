const KOREA_OFFSET = "+09:00";

export function dateToInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toKoreaIso(date: string, time: string, allDay: boolean): string {
  const safeTime = allDay ? "00:00" : time || "00:00";
  return `${date}T${safeTime}:00${KOREA_OFFSET}`;
}

export function addOneDay(date: string): string {
  const value = new Date(`${date}T00:00:00${KOREA_OFFSET}`);
  value.setDate(value.getDate() + 1);
  return dateToInputDate(value);
}

export function splitKoreaDateTime(value: string): { date: string; time: string } {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    time: `${pick("hour")}:${pick("minute")}`
  };
}

export function formatKoreaDateTime(value: string, allDay: boolean): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: allDay ? undefined : "short"
  }).format(date);
}
