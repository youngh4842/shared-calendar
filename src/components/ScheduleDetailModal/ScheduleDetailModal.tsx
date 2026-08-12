"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { CalendarSetting, Schedule, ScheduleType } from "@/types/schedule";
import { formatKoreaDateRange } from "@/utils/date";
import { confirmationLabels, getScheduleTypeLabel } from "@/utils/scheduleColors";

type Props = {
  schedule: Schedule;
  settings: Record<ScheduleType, CalendarSetting>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
};

export function ScheduleDetailModal({ schedule, settings, onClose, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await onDelete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "일정을 삭제하지 못했습니다.");
      setDeleting(false);
    }
  }

  return (
    <div onClick={handleOverlayClick} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {schedule.scheduleType ? <p className="text-sm font-semibold text-emerald-700">{getScheduleTypeLabel(settings, schedule.scheduleType)}</p> : null}
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{schedule.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">
            닫기
          </button>
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <dt className="font-semibold text-slate-500">날짜</dt>
            <dd className="text-slate-900">{formatKoreaDateRange(schedule.startDate, schedule.endDate)}</dd>
          </div>
          {schedule.scheduleType ? (
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <dt className="font-semibold text-slate-500">일정 구분</dt>
              <dd className="text-slate-900">{getScheduleTypeLabel(settings, schedule.scheduleType)}</dd>
            </div>
          ) : null}
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <dt className="font-semibold text-slate-500">확정 여부</dt>
            <dd className="text-slate-900">{confirmationLabels[schedule.confirmationStatus]}</dd>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <dt className="font-semibold text-slate-500">메모</dt>
            <dd className="whitespace-pre-wrap text-slate-900">{schedule.memo || "메모 없음"}</dd>
          </div>
        </dl>

        {confirming ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">이 일정을 삭제하시겠습니까?</p>
            {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-md border border-red-200 bg-white font-semibold text-slate-700">
                취소
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="h-10 rounded-md bg-red-600 font-semibold text-white disabled:bg-red-300">
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={onEdit} className="h-11 rounded-md border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
              수정
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="h-11 rounded-md bg-red-600 font-semibold text-white hover:bg-red-500">
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
