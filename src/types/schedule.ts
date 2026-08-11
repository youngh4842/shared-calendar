export type CalendarUser = "A" | "B";

export type ScheduleType = "A" | "B" | "COMMON";

export type Schedule = {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  scheduleType: ScheduleType;
  createdBy: CalendarUser;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleInput = {
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  scheduleType: ScheduleType;
  createdBy: CalendarUser;
  memo?: string | null;
};
