"use client";

import { FormEvent, useMemo, useState } from "react";
import type { CalendarUser, Schedule, ScheduleType } from "@/types/schedule";
import { addOneDay, splitKoreaDateTime, toKoreaIso } from "@/utils/date";

type Props =
  | {
      mode: "create";
      currentUser: CalendarUser;
      initialDate: string;
      onClose: () => void;
      onSaved: () => void;
    }
  | {
      mode: "edit";
      currentUser: CalendarUser;
      schedule: Schedule;
      onClose: () => void;
      onSaved: () => void;
    };

export function ScheduleModal(props: Props) {
  const initial = useMemo<{
    title: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    allDay: boolean;
    scheduleType: ScheduleType;
    memo: string;
  }>(() => {
    if (props.mode === "edit") {
      const start = splitKoreaDateTime(props.schedule.startAt);
      const end = splitKoreaDateTime(props.schedule.endAt);
      return {
        title: props.schedule.title,
        startDate: start.date,
        startTime: start.time,
        endDate: props.schedule.allDay ? addOneDay(start.date) : end.date,
        endTime: end.time,
        allDay: props.schedule.allDay,
        scheduleType: props.schedule.scheduleType === "COMMON" ? "COMMON" : props.currentUser,
        memo: props.schedule.memo ?? ""
      };
    }

    return {
      title: "",
      startDate: props.initialDate,
      startTime: "09:00",
      endDate: props.initialDate,
      endTime: "10:00",
      allDay: false,
      scheduleType: props.currentUser,
      memo: ""
    };
  }, [props]);

  const [title, setTitle] = useState(initial.title);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [allDay, setAllDay] = useState(initial.allDay);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initial.scheduleType);
  const [memo, setMemo] = useState(initial.memo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title,
      startAt: toKoreaIso(startDate, startTime, allDay),
      endAt: toKoreaIso(endDate, endTime, allDay),
      allDay,
      scheduleType,
      createdBy: props.currentUser,
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

  function handleAllDayChange(checked: boolean) {
    setAllDay(checked);
    if (checked && startDate === endDate) {
      setEndDate(addOneDay(startDate));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{props.mode === "edit" ? "일정 수정" : "일정 등록"}</h2>
          <button type="button" onClick={props.onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">
            닫기
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            일정 제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-slate-500" required />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              시작 날짜
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              시작 시간
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={allDay} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500 disabled:bg-slate-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              종료 날짜
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              종료 시간
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={allDay} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500 disabled:bg-slate-100" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={allDay} onChange={(event) => handleAllDayChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            종일 일정
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-700">일정 구분</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold">
                <input type="radio" name="scheduleType" checked={scheduleType === props.currentUser} onChange={() => setScheduleType(props.currentUser)} />
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

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={props.onClose} className="h-11 rounded-md border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
            취소
          </button>
          <button type="submit" disabled={saving} className="h-11 rounded-md bg-slate-950 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
