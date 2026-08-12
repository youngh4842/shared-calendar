export type ScheduleType = "A" | "B" | "COMMON";

export type ConfirmationStatus = "CONFIRMED" | "TENTATIVE";

export type ColorKey = "blue" | "purple" | "pink" | "orange" | "green" | "gray";

export type Schedule = {
  id: number;
  startDate: string;
  endDate: string;
  title: string;
  scheduleType: ScheduleType;
  confirmationStatus: ConfirmationStatus;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleInput = {
  startDate: string;
  endDate: string;
  title: string;
  scheduleType: ScheduleType;
  confirmationStatus: ConfirmationStatus;
  memo?: string | null;
};

export type CalendarSetting = {
  scheduleType: ScheduleType;
  displayName: string;
  colorKey: ColorKey;
};
