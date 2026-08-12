"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CalendarSetting, ScheduleType } from "@/types/schedule";
import { colorKeyOptions, colorLabels, colorPalettes, defaultCalendarSettings, scheduleTypeOptions, toSettingsRecord } from "@/utils/scheduleColors";

const sectionTitles: Record<ScheduleType, string> = {
  A: "A 일정",
  B: "B 일정",
  COMMON: "같이 일정"
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<ScheduleType, CalendarSetting>>(defaultCalendarSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsList = useMemo(() => scheduleTypeOptions.map((scheduleType) => settings[scheduleType]), [settings]);

  useEffect(() => {
    let ignore = false;

    async function fetchSettings() {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "설정을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setSettings(toSettingsRecord(data));
        }
      } catch (caught) {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : "설정을 불러오지 못했습니다.");
          setSettings(defaultCalendarSettings);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void fetchSettings();

    return () => {
      ignore = true;
    };
  }, []);

  function updateSetting(scheduleType: ScheduleType, patch: Partial<CalendarSetting>) {
    setSettings((current) => ({
      ...current,
      [scheduleType]: {
        ...current[scheduleType],
        ...patch
      }
    }));
  }

  async function saveSettings() {
    setError(null);
    setMessage(null);

    const invalid = settingsList.some((setting) => !setting.displayName.trim());
    if (invalid) {
      setError("표시 이름을 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settingsList)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "설정을 저장하지 못했습니다.");
      }

      setSettings(toSettingsRecord(data));
      setMessage("저장되었습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-lg border border-white/70 bg-white/90 p-4 shadow-sm sm:p-6">
          <div className="mb-6 grid gap-4">
            <Link href="/" className="w-fit rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              ← 캘린더
            </Link>
            <div>
              <p className="text-sm font-semibold text-slate-500">Between Days</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">캘린더 설정</h1>
            </div>
          </div>

          {loading ? <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">설정을 불러오는 중...</p> : null}
          {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

          <div className="grid gap-5">
            {scheduleTypeOptions.map((scheduleType) => {
              const setting = settings[scheduleType];
              return (
                <section key={scheduleType} className="grid gap-3 border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
                  <h2 className="text-base font-bold text-slate-950">{sectionTitles[scheduleType]}</h2>

                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    표시 이름
                    <input
                      value={setting.displayName}
                      onChange={(event) => updateSetting(scheduleType, { displayName: event.target.value })}
                      className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-slate-500"
                    />
                  </label>

                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-medium text-slate-700">색상</legend>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {colorKeyOptions.map((colorKey) => {
                        const selected = setting.colorKey === colorKey;
                        const palette = colorPalettes[colorKey];
                        return (
                          <button
                            key={colorKey}
                            type="button"
                            onClick={() => updateSetting(scheduleType, { colorKey })}
                            className={[
                              "grid h-16 place-items-center rounded-md border text-xs font-semibold transition",
                              selected ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200 hover:border-slate-400"
                            ].join(" ")}
                            style={{
                              backgroundColor: palette.tentativeBackground,
                              color: palette.tentativeText
                            }}
                            aria-pressed={selected}
                          >
                            <span className="h-5 w-5 rounded-full border border-white/80 shadow-sm" style={{ backgroundColor: palette.confirmedBackground }} />
                            {colorLabels[colorKey]}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </section>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={saveSettings} disabled={saving || loading} className="h-11 rounded-md bg-slate-950 px-6 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
