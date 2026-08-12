export type ScheduleType = "A" | "B" | "COMMON";

export type ConfirmationStatus = "CONFIRMED" | "TENTATIVE";

export type Schedule = {
  id: number;
  scheduleDate: string;
  title: string;
  scheduleType: ScheduleType;
  confirmationStatus: ConfirmationStatus;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleInput = {
  scheduleDate: string;
  title: string;
  scheduleType: ScheduleType;
  confirmationStatus: ConfirmationStatus;
  memo?: string | null;
};
