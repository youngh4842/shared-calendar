"use client";

import { FormEvent, useMemo, useState } from "react";
import type { CalendarSetting, ConfirmationStatus, Schedule, ScheduleType } from "@/types/schedule";
import { colorPalettes, confirmationLabels, getScheduleTypeLabel, scheduleTypeOptions } from "@/utils/scheduleColors";

type Props =
  | {
      mode: "create";
      initialDate: string;
      settings: Record<ScheduleType, CalendarSetting>;
      onClose: () => void;
      onSaved: () => void;
    }
  | {
      mode: "edit";
      schedule: Schedule;
      settings: Record<ScheduleType, CalendarSetting>;
      onClose: () => void;
      onSaved: () => void;
    };

const confirmationOptions: ConfirmationStatus[] = ["CONFIRMED", "TENTATIVE"];

export function ScheduleModal(props: Props) {
  const initial = useMemo<{
    dateMode: "single" | "range";
    startDate: string;
    endDate: string;
    title: string;
    scheduleType: ScheduleType | null;
    confirmationStatus: ConfirmationStatus | null;
    memo: string;
  }>(() => {
    if (props.mode === "edit") {
      return {
        dateMode: props.schedule.startDate === props.schedule.endDate ? "single" : "range",
        startDate: props.schedule.startDate,
        endDate: props.schedule.endDate,
        title: props.schedule.title,
        scheduleType: props.schedule.scheduleType,
        confirmationStatus: props.schedule.confirmationStatus,
        memo: props.schedule.memo ?? ""
      };
    }

    return {
      dateMode: "single",
      startDate: props.initialDate,
      endDate: props.initialDate,
      title: "",
      scheduleType: null,
      confirmationStatus: null,
      memo: ""
    };
  }, [props]);

  const [dateMode, setDateMode] = useState<"single" | "range">(initial.dateMode);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [title, setTitle] = useState(initial.title);
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(initial.scheduleType);
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus | null>(initial.confirmationStatus);
  const [memo, setMemo] = useState(initial.memo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleDateModeChange(nextMode: "single" | "range") {
    setDateMode(nextMode);
    if (nextMode === "single") {
      setEndDate(startDate);
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (dateMode === "single") {
      setEndDate(value);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEndDate = dateMode === "single" ? startDate : endDate;

    if (!startDate || !normalizedEndDate) {
      setError("날짜를 선택해주세요.");
      return;
    }

    if (normalizedEndDate < startDate) {
      setError("종료일은 시작일 이후 날짜를 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!scheduleType) {
      setError("일정 구분을 선택해주세요.");
      return;
    }

    if (!confirmationStatus) {
      setError("확정 여부를 선택해주세요.");
      return;
    }

    setSaving(true);

    const payload = {
      startDate,
      endDate: normalizedEndDate,
      title,
      scheduleType,
      confirmationStatus,
      memo
    };

    try {
      const url = props.mode === "edit" ? `/api/schedules/${props.schedule.id}` : "/api/schedules";
      const response = await fetch(url, {
        method: props.mode === "edit" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "일정을 저장하지 못했습니다.");
      }

      props.onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "일정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <form noValidate onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{props.mode === "edit" ? "일정 수정" : "일정 등록"}</h2>
          <button type="button" onClick={props.onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">
            닫기
          </button>
        </div>

        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-700">날짜 *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["single", "range"] as const).map((option) => {
                const selected = dateMode === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleDateModeChange(option)}
                    className={[
                      "h-11 rounded-md border px-3 text-sm font-semibold transition",
                      selected ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    ].join(" ")}
                    aria-pressed={selected}
                  >
                    {option === "single" ? "하루" : "기간"}
                  </button>
                );
              })}
            </div>

            {dateMode === "single" ? (
              <input type="date" value={startDate} onChange={(event) => handleStartDateChange(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500" required />
            ) : (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input type="date" value={startDate} onChange={(event) => handleStartDateChange(event.target.value)} className="h-11 min-w-0 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500" required />
                <span className="text-sm font-semibold text-slate-500">~</span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-11 min-w-0 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500" required />
              </div>
            )}
          </fieldset>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            제목 *
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-slate-500" required />
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-700">일정 구분 *</legend>
            <div className="grid grid-cols-3 gap-2">
              {scheduleTypeOptions.map((option) => {
                const palette = colorPalettes[props.settings[option].colorKey];
                const selected = scheduleType === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setScheduleType(option)}
                    className="h-11 rounded-md border px-3 text-sm font-semibold transition"
                    style={{
                      borderColor: selected ? palette.confirmedBorder : "#cbd5e1",
                      backgroundColor: selected ? palette.confirmedBackground : "#ffffff",
                      color: selected ? palette.confirmedText : "#334155"
                    }}
                    aria-pressed={selected}
                  >
                    {getScheduleTypeLabel(props.settings, option)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-700">확정 구분 *</legend>
            <div className="grid grid-cols-2 gap-2">
              {confirmationOptions.map((option) => {
                const selected = confirmationStatus === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setConfirmationStatus(option)}
                    className={[
                      "h-11 rounded-md border px-3 text-sm font-semibold transition",
                      selected ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    ].join(" ")}
                    aria-pressed={selected}
                  >
                    {confirmationLabels[option]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            메모
            <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500" />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={props.onClose} className="h-11 rounded-md border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            취소
          </button>
          <button type="submit" disabled={saving} className="h-11 rounded-md bg-slate-950 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {saving ? "저장 중..." : props.mode === "edit" ? "저장" : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
