"use client";

import { FormEvent, useMemo, useState } from "react";
import type { CalendarUser, Schedule, ScheduleType } from "@/types/schedule";

type Props =
  | {
      mode: "create";
      currentUser: CalendarUser | null;
      initialDate: string;
      onClose: () => void;
      onSaved: () => void;
    }
  | {
      mode: "edit";
      currentUser: CalendarUser | null;
      schedule: Schedule;
      onClose: () => void;
      onSaved: () => void;
    };

export function ScheduleModal(props: Props) {
  const effectiveUser =
    props.currentUser ??
    (props.mode === "edit"
      ? props.schedule.scheduleType === "COMMON"
        ? props.schedule.createdBy
        : props.schedule.scheduleType
      : null);
  const isUserRequired = props.mode === "create" && !effectiveUser;

  const initial = useMemo<{
    scheduleDate: string;
    title: string;
    scheduleType: ScheduleType;
    memo: string;
  }>(() => {
    if (props.mode === "edit") {
      return {
        scheduleDate: props.schedule.scheduleDate,
        title: props.schedule.title,
        scheduleType: props.schedule.scheduleType,
        memo: props.schedule.memo ?? ""
      };
    }

    return {
      scheduleDate: props.initialDate,
      title: "",
      scheduleType: props.currentUser ?? "COMMON",
      memo: ""
    };
  }, [props]);

  const [scheduleDate, setScheduleDate] = useState(initial.scheduleDate);
  const [title, setTitle] = useState(initial.title);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initial.scheduleType);
  const [memo, setMemo] = useState(initial.memo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!effectiveUser) {
      setError("일정을 등록하려면 A 또는 B를 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    setSaving(true);

    const payload = {
      scheduleDate,
      title,
      scheduleType,
      createdBy: effectiveUser,
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
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{props.mode === "edit" ? "일정 수정" : "일정 등록"}</h2>
          <button type="button" onClick={props.onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">
            닫기
          </button>
        </div>

        {isUserRequired ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            일정을 등록하려면 A 또는 B를 선택해주세요.
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              날짜
              <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500" required />
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              제목 *
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-slate-500" required />
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-slate-700">일정 구분</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold">
                  <input type="radio" name="scheduleType" checked={scheduleType === effectiveUser} onChange={() => effectiveUser && setScheduleType(effectiveUser)} />
                  내 일정
                </label>
                <label className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold">
                  <input type="radio" name="scheduleType" checked={scheduleType === "COMMON"} onChange={() => setScheduleType("COMMON")} />
                  같이 일정
                </label>
              </div>
            </fieldset>

            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              메모
              <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500" />
            </label>
          </div>
        )}

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={props.onClose} className="h-11 rounded-md border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            취소
          </button>
          <button type="submit" disabled={saving || isUserRequired} className="h-11 rounded-md bg-slate-950 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {saving ? "저장 중..." : props.mode === "edit" ? "저장" : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
