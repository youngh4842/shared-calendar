import { NextResponse } from "next/server";
import { logApiError } from "@/lib/log";
import type { Holiday } from "@/types/holiday";

type CachedHolidays = {
  expiresAt: number;
  data: Holiday[];
};

type KasiHolidayItem = {
  locdate?: number | string;
  dateName?: string;
  isHoliday?: string;
};

type NagerHolidayItem = {
  date?: string;
  localName?: string;
  name?: string;
  types?: string[];
};

const cache = new Map<string, CachedHolidays>();
const cacheTtlMs = 1000 * 60 * 60 * 24;

function isValidYear(value: string | null): value is string {
  return !!value && /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2100;
}

function isValidMonth(value: string | null): value is string {
  return !!value && /^(0?[1-9]|1[0-2])$/.test(value);
}

function normalizeMonth(value: string | number) {
  return String(value).padStart(2, "0");
}

function normalizeKasiDate(value: number | string | undefined) {
  const raw = String(value ?? "");
  if (!/^\d{8}$/.test(raw)) {
    return "";
  }

  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function normalizeKasiItems(value: unknown): KasiHolidayItem[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const response = value as {
    response?: {
      body?: {
        items?: {
          item?: KasiHolidayItem | KasiHolidayItem[];
        };
      };
    };
  };
  const item = response.response?.body?.items?.item;

  if (!item) {
    return [];
  }

  return Array.isArray(item) ? item : [item];
}

function mapKasiHoliday(item: KasiHolidayItem): Holiday | null {
  const date = normalizeKasiDate(item.locdate);
  const name = item.dateName?.trim();

  if (!date || !name || item.isHoliday !== "Y") {
    return null;
  }

  return {
    date,
    name,
    isHoliday: true
  };
}

function mapNagerHoliday(item: NagerHolidayItem): Holiday | null {
  if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    return null;
  }

  if (item.types && !item.types.includes("Public")) {
    return null;
  }

  return {
    date: item.date,
    name: item.localName || item.name || "공휴일",
    isHoliday: true
  };
}

function getFixedKoreanHolidays(year: string, month: string | null): Holiday[] {
  const holidays: Array<{ month: string; day: string; name: string }> = [
    { month: "01", day: "01", name: "신정" },
    { month: "03", day: "01", name: "삼일절" },
    { month: "05", day: "05", name: "어린이날" },
    { month: "06", day: "06", name: "현충일" },
    { month: "08", day: "15", name: "광복절" },
    { month: "10", day: "03", name: "개천절" },
    { month: "10", day: "09", name: "한글날" },
    { month: "12", day: "25", name: "성탄절" }
  ];
  const normalizedMonth = month ? normalizeMonth(month) : null;

  return holidays
    .filter((holiday) => !normalizedMonth || holiday.month === normalizedMonth)
    .map((holiday) => ({
      date: `${year}-${holiday.month}-${holiday.day}`,
      name: holiday.name,
      isHoliday: true
    }));
}

async function fetchKasiMonth(year: string, month: string, serviceKey: string) {
  const params = new URLSearchParams({
    solYear: year,
    solMonth: month,
    numOfRows: "50",
    _type: "json",
    ServiceKey: serviceKey
  });
  const response = await fetch(`https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?${params}`, {
    next: { revalidate: 86400 }
  });

  if (!response.ok) {
    throw new Error(`KASI holiday API failed with ${response.status}`);
  }

  const data = await response.json();
  return normalizeKasiItems(data).flatMap((item) => {
    const holiday = mapKasiHoliday(item);
    return holiday ? [holiday] : [];
  });
}

async function fetchKasiHolidays(year: string, month: string | null, serviceKey: string) {
  const months = month ? [normalizeMonth(month)] : Array.from({ length: 12 }, (_, index) => normalizeMonth(index + 1));
  const monthly = await Promise.all(months.map((targetMonth) => fetchKasiMonth(year, targetMonth, serviceKey)));
  return monthly.flat();
}

async function fetchNagerHolidays(year: string, month: string | null) {
  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`, {
    next: { revalidate: 86400 }
  });

  if (!response.ok) {
    throw new Error(`Nager holiday API failed with ${response.status}`);
  }

  const data = (await response.json()) as NagerHolidayItem[];
  const holidays = data.flatMap((item) => {
    const holiday = mapNagerHoliday(item);
    return holiday ? [holiday] : [];
  });

  if (!month) {
    return holidays;
  }

  const normalizedMonth = normalizeMonth(month);
  return holidays.filter((holiday) => holiday.date.slice(5, 7) === normalizedMonth);
}

function uniqueHolidays(holidays: Holiday[]) {
  const byDate = new Map<string, Holiday>();
  holidays.forEach((holiday) => {
    byDate.set(holiday.date, holiday);
  });

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!isValidYear(year) || (month && !isValidMonth(month))) {
    return NextResponse.json({ error: "공휴일 조회 날짜가 올바르지 않습니다." }, { status: 400 });
  }

  const cacheKey = `${year}-${month ? normalizeMonth(month) : "all"}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const officialKey = process.env.HOLIDAY_API_KEY;
    const holidays = officialKey
      ? await fetchKasiHolidays(year, month, officialKey)
      : [...(await fetchNagerHolidays(year, month)), ...getFixedKoreanHolidays(year, month)];
    const data = uniqueHolidays(holidays);
    cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs });

    return NextResponse.json(data);
  } catch (error) {
    logApiError("[api/holidays] GET failed", error);
    cache.set(cacheKey, { data: [], expiresAt: Date.now() + 1000 * 60 * 10 });

    return NextResponse.json([]);
  }
}
