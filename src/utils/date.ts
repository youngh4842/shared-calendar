export function subtractOneDay(date: string): string {
  const value = new Date(`${date}T00:00:00+09:00`);
  value.setDate(value.getDate() - 1);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatKoreaDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium"
  }).format(new Date(`${value}T00:00:00+09:00`));
}
