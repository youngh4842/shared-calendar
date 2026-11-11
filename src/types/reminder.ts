export type Reminder = {
  id: number;
  title: string;
  body: string;
  scheduledAt: string;
  scheduleId: number | null;
  scheduleTitle: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type ReminderInput = {
  title: string;
  body: string;
  scheduledAt: string;
  scheduleId?: number | null;
};

