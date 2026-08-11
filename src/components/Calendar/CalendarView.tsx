"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { useCallback, useMemo, useState } from "react";
import { ScheduleDetailModal } from "@/components/ScheduleDetailModal/ScheduleDetailModal";
import { ScheduleModal } from "@/components/ScheduleModal/ScheduleModal";
import type { CalendarUser, Schedule } from "@/types/schedule";
import { scheduleColors } from "@/utils/scheduleColors";

type Props = {
  currentUser: CalendarUser;
};

type ModalState =
  | { mode: "create"; date: string }
  | { mode: "edit"; schedule: Schedule }
  | { mode: "detail"; schedule: Schedule }
  | null;

export function CalendarView({ currentUser }: Props) {
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
        return {
          id: String(schedule.id),
          title: schedule.title,
          start: schedule.startAt,
          end: schedule.endAt,
          allDay: schedule.allDay,
          backgroundColor: colors.background,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            schedule
          }
        };
      }),
    [schedules]
  );

  function handleDatesSet(arg: DatesSetArg) {
    const range = {
      start: arg.startStr,
      end: arg.endStr
    };
    setLastRange(range);
    void fetchSchedules(range.start, range.end);
  }

  function handleDateClick(arg: DateClickArg) {
    setModal({ mode: "create", date: arg.dateStr });
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-sm font-medium text-slate-700">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-blue-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2f80ed]" /> A
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-1 text-violet-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" /> B
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22a06b]" /> 같이
          </span>
        </div>
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
          left: "prev,next today",
          center: "title",
          right: ""
        }}
        buttonText={{
          today: "오늘"
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
          currentUser={currentUser}
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
          currentUser={currentUser}
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
