"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, DayCellContentArg, EventClickArg, EventInput } from "@fullcalendar/core";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScheduleDetailModal } from "@/components/ScheduleDetailModal/ScheduleDetailModal";
import { ScheduleModal } from "@/components/ScheduleModal/ScheduleModal";
import type { Holiday } from "@/types/holiday";
import type { CalendarSetting, Schedule, ScheduleType } from "@/types/schedule";
import { defaultCalendarSettings, getSchedulePalette, toSettingsRecord } from "@/utils/scheduleColors";
import { addOneDay, formatCalendarDate, normalizeCalendarDate, subtractOneDay } from "@/utils/date";

type ModalState =
  | { mode: "create"; date: string }
  | { mode: "edit"; schedule: Schedule }
  | { mode: "detail"; schedule: Schedule }
  | null;

type DateDecoration = {
  date: string;
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function getYearsInRange(start: string, end: string) {
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));

  if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
    return [];
  }

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
}

function getDayTone(date: Date, holiday: Holiday | undefined) {
  if (holiday?.isHoliday || date.getDay() === 0) {
    return "holiday";
  }

  if (date.getDay() === 6) {
    return "saturday";
  }

  return "weekday";
}

export function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidaysByDate, setHolidaysByDate] = useState<Record<string, Holiday>>({});
  const [settings, setSettings] = useState<Record<ScheduleType, CalendarSetting>>(defaultCalendarSettings);
  const [modal, setModal] = useState<ModalState>(null);
  const [lastRange, setLastRange] = useState<{ start: string; end: string } | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDecorationMode, setIsDecorationMode] = useState(false);
  const [decoratedDates, setDecoratedDates] = useState<Set<string>>(() => new Set());
  const [pendingDecorations, setPendingDecorations] = useState<Set<string>>(() => new Set());

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

  const fetchHolidays = useCallback(async (start: string, end: string) => {
    try {
      const years = getYearsInRange(start, end);
      const responses = await Promise.all(years.map((year) => fetch(`/api/holidays?year=${year}`)));
      const holidays = await Promise.all(
        responses.map(async (response) => {
          if (!response.ok) {
            return [];
          }

          return (await response.json()) as Holiday[];
        })
      );
      const nextHolidays = holidays.flat().reduce<Record<string, Holiday>>((record, holiday) => {
        record[holiday.date] = holiday;
        return record;
      }, {});

      setHolidaysByDate(nextHolidays);
    } catch {
      setHolidaysByDate({});
    }
  }, []);

  const fetchDecorations = useCallback(async (start: string, end: string) => {
    try {
      const response = await fetch(`/api/decorations?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "날짜 꾸미기를 불러오지 못했습니다.");
      }

      setDecoratedDates(new Set((data as DateDecoration[]).map((decoration) => decoration.date)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "날짜 꾸미기를 불러오지 못했습니다.");
      setDecoratedDates(new Set());
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "설정을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setSettings(toSettingsRecord(data));
        }
      } catch {
        if (!ignore) {
          setSettings(defaultCalendarSettings);
        }
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, []);

  const refresh = useCallback(() => {
    if (lastRange) {
      void fetchSchedules(lastRange.start, lastRange.end);
    }
  }, [fetchSchedules, lastRange]);

  const events = useMemo<EventInput[]>(
    () =>
      schedules.map((schedule) => {
        const colors = getSchedulePalette(settings, schedule.scheduleType, schedule.colorKey);
        const isTentative = schedule.confirmationStatus === "TENTATIVE";
        return {
          id: String(schedule.id),
          title: schedule.title,
          start: schedule.startDate,
          end: addOneDay(schedule.endDate),
          allDay: true,
          backgroundColor: isTentative ? colors.tentativeBackground : colors.confirmedBackground,
          borderColor: isTentative ? colors.tentativeBorder : colors.confirmedBorder,
          textColor: isTentative ? colors.tentativeText : colors.confirmedText,
          classNames: isTentative ? ["schedule-event-tentative"] : ["schedule-event-confirmed"],
          extendedProps: {
            schedule
          }
        };
      }),
    [schedules, settings]
  );

  const renderDayCellContent = useCallback(
    (arg: DayCellContentArg) => {
      const dateKey = formatCalendarDate(arg.date);
      const holiday = holidaysByDate[dateKey];
      const tone = getDayTone(arg.date, holiday);
      const numberText = arg.dayNumberText.replace("일", "");

      return (
        <div className="calendar-day-meta">
          <span className={`calendar-day-number calendar-day-number-${tone}`}>{numberText}</span>
          {holiday ? <span className="calendar-holiday-name">{holiday.name}</span> : null}
        </div>
      );
    },
    [holidaysByDate]
  );

  const getDayCellClassNames = useCallback(
    (arg: DayCellContentArg) => {
      const dateKey = formatCalendarDate(arg.date);
      const holiday = holidaysByDate[dateKey];
      const classNames = [`calendar-day-${getDayTone(arg.date, holiday)}`];

      if (decoratedDates.has(dateKey)) {
        classNames.push("calendar-day-decorated");
      }

      if (pendingDecorations.has(dateKey)) {
        classNames.push("calendar-day-decoration-pending");
      }

      return classNames;
    },
    [decoratedDates, holidaysByDate, pendingDecorations]
  );

  function handleDatesSet(arg: DatesSetArg) {
    setCurrentTitle(arg.view.title);

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
    void fetchHolidays(range.start, range.end);
    void fetchDecorations(range.start, range.end);
  }

  function moveMonth(direction: "prev" | "next") {
    const api = calendarRef.current?.getApi();
    if (direction === "prev") {
      api?.prev();
      return;
    }

    api?.next();
  }

  async function toggleDateDecoration(date: string) {
    if (!date || pendingDecorations.has(date)) {
      return;
    }

    const shouldRemove = decoratedDates.has(date);
    setPendingDecorations((previous) => new Set(previous).add(date));
    setDecoratedDates((previous) => {
      const next = new Set(previous);
      if (shouldRemove) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });

    try {
      const response = shouldRemove
        ? await fetch(`/api/decorations?date=${encodeURIComponent(date)}`, { method: "DELETE" })
        : await fetch("/api/decorations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date })
          });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "날짜 꾸미기를 저장하지 못했습니다.");
      }
    } catch (caught) {
      setDecoratedDates((previous) => {
        const next = new Set(previous);
        if (shouldRemove) {
          next.add(date);
        } else {
          next.delete(date);
        }
        return next;
      });
      setError(caught instanceof Error ? caught.message : "날짜 꾸미기를 저장하지 못했습니다.");
    } finally {
      setPendingDecorations((previous) => {
        const next = new Set(previous);
        next.delete(date);
        return next;
      });
    }
  }

  function handleDateClick(arg: DateClickArg) {
    const date = normalizeCalendarDate(arg.dateStr);

    if (isDecorationMode) {
      void toggleDateDecoration(date);
      return;
    }

    setModal({ mode: "create", date });
  }

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.stopPropagation();
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
    <section className={["rounded-lg border border-white/70 bg-white/90 p-3 shadow-sm sm:p-5", isDecorationMode ? "calendar-decoration-mode" : ""].join(" ")}>
      <div className="calendar-sticky-header">
        <div className="calendar-sticky-toolbar">
          <button type="button" onClick={() => moveMonth("prev")} className="calendar-nav-button" aria-label="이전 달">
            &lt;
          </button>
          <div className="calendar-title" aria-live="polite">
            {currentTitle}
          </div>
          <div className="calendar-toolbar-actions">
            <button type="button" onClick={() => moveMonth("next")} className="calendar-nav-button" aria-label="다음 달">
              &gt;
            </button>
            <button
              type="button"
              onClick={() => setIsDecorationMode((value) => !value)}
              className={["calendar-decoration-button", isDecorationMode ? "calendar-decoration-button-active" : ""].join(" ")}
              aria-label="날짜 꾸미기 모드"
              aria-pressed={isDecorationMode}
              title="날짜 꾸미기"
            >
              ❤️
            </button>
            <Link href="/settings" className="calendar-settings-link" aria-label="캘린더 설정">
              설정
            </Link>
          </div>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {weekdays.map((day, index) => (
            <div key={day} className={["calendar-weekday", index === 0 ? "calendar-weekday-holiday" : "", index === 6 ? "calendar-weekday-saturday" : ""].join(" ")}>
              {day}
            </div>
          ))}
        </div>
      </div>

      {loading ? <p className="my-3 text-right text-sm text-slate-500">일정을 불러오는 중...</p> : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="ko"
        timeZone="Asia/Seoul"
        headerToolbar={false}
        dayHeaders={false}
        firstDay={0}
        height="auto"
        selectable
        dayMaxEvents={3}
        events={events}
        datesSet={handleDatesSet}
        dayCellClassNames={getDayCellClassNames}
        dayCellContent={renderDayCellContent}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />

      {modal?.mode === "create" ? (
        <ScheduleModal
          mode="create"
          initialDate={modal.date}
          settings={settings}
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
          settings={settings}
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
          settings={settings}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ mode: "edit", schedule: modal.schedule })}
          onDelete={() => deleteSchedule(modal.schedule.id)}
        />
      ) : null}
    </section>
  );
}
