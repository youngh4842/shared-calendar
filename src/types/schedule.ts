export type CalendarUser = "A" | "B";

export type ScheduleType = "A" | "B" | "COMMON";

export type Schedule = {
  id: number;
  scheduleDate: string;
  title: string;
  scheduleType: ScheduleType;
  createdBy: CalendarUser;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleInput = {
  scheduleDate: string;
  title: string;
  scheduleType: ScheduleType;
  createdBy: CalendarUser;
  memo?: string | null;
};
