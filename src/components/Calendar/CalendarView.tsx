"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { useCallback, useMemo, useState } from "react";
import { ScheduleDetailModal } from "@/components/ScheduleDetailModal/ScheduleDetailModal";
import { ScheduleModal } from "@/components/ScheduleModal/ScheduleModal";
import type { Schedule } from "@/types/schedule";
import { scheduleColors } from "@/utils/scheduleColors";
import { normalizeCalendarDate, subtractOneDay } from "@/utils/date";

type ModalState =
  | { mode: "create"; date: string }
  | { mode: "edit"; schedule: Schedule }
  | { mode: "detail"; schedule: Schedule }
  | null;

export function CalendarView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [lastRange, setLastRange] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "일정을 불러오지 못했습니다.");
      }

      setSchedules(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (lastRange) {
      void fetchSchedules(lastRange.start, lastRange.end);
    }
  }, [fetchSchedules, lastRange]);

  const events = useMemo<EventInput[]>(
    () =>
      schedules.map((schedule) => {
        const colors = scheduleColors[schedule.scheduleType];
        const isTentative = schedule.confirmationStatus === "TENTATIVE";
        return {
          id: String(schedule.id),
          title: schedule.title,
          start: schedule.scheduleDate,
          allDay: true,
          backgroundColor: isTentative ? colors.soft : colors.background,
          borderColor: colors.border,
          textColor: isTentative ? colors.softText : colors.text,
          classNames: isTentative ? ["schedule-event-tentative"] : ["schedule-event-confirmed"],
          extendedProps: {
            schedule
          }
        };
      }),
    [schedules]
  );

  function handleDatesSet(arg: DatesSetArg) {
    const range = {
      start: normalizeCalendarDate(arg.startStr),
      end: subtractOneDay(arg.endStr)
    };

    if (!range.start || !range.end) {
      setError("캘린더 날짜 범위를 계산하지 못했습니다.");
      return;
    }

    setLastRange(range);
    void fetchSchedules(range.start, range.end);
  }

  function handleDateClick(arg: DateClickArg) {
    setModal({ mode: "create", date: normalizeCalendarDate(arg.dateStr) });
  }

  function handleEventClick(arg: EventClickArg) {
    const schedule = arg.event.extendedProps.schedule as Schedule;
    setModal({ mode: "detail", schedule });
  }

  async function deleteSchedule(id: number) {
    const response = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "일정을 삭제하지 못했습니다.");
    }
    setModal(null);
    refresh();
  }

  return (
    <section className="rounded-lg border border-white/70 bg-white/90 p-3 shadow-sm sm:p-5">
      <div className="mb-3 flex justify-end">
        {loading ? <p className="text-sm text-slate-500">일정을 불러오는 중...</p> : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="ko"
        timeZone="Asia/Seoul"
        headerToolbar={{
          left: "prev",
          center: "title",
          right: "next"
        }}
        firstDay={1}
        height="auto"
        selectable
        dayMaxEvents={3}
        events={events}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />

      {modal?.mode === "create" ? (
        <ScheduleModal
          mode="create"
          initialDate={modal.date}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      ) : null}

      {modal?.mode === "edit" ? (
        <ScheduleModal
          mode="edit"
          schedule={modal.schedule}
          onClose={() => setModal({ mode: "detail", schedule: modal.schedule })}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      ) : null}

      {modal?.mode === "detail" ? (
        <ScheduleDetailModal
          schedule={modal.schedule}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ mode: "edit", schedule: modal.schedule })}
          onDelete={() => deleteSchedule(modal.schedule.id)}
        />
      ) : null}
    </section>
  );
}
