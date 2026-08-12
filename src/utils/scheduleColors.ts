import type { ConfirmationStatus, ScheduleType } from "@/types/schedule";

export const scheduleLabels: Record<ScheduleType, string> = {
  A: "A 일정",
  B: "B 일정",
  COMMON: "같이 일정"
};

export const confirmationLabels: Record<ConfirmationStatus, string> = {
  CONFIRMED: "확정",
  TENTATIVE: "예정"
};

export const scheduleTypeButtonLabels: Record<ScheduleType, string> = {
  A: "A",
  B: "B",
  COMMON: "같이"
};

export const scheduleColors: Record<ScheduleType, { background: string; border: string; text: string; soft: string; softText: string }> = {
  A: {
    background: "#2f80ed",
    border: "#1d63c7",
    text: "#ffffff",
    soft: "#dbeafe",
    softText: "#1d4ed8"
  },
  B: {
    background: "#8b5cf6",
    border: "#6d3fe0",
    text: "#ffffff",
    soft: "#ede9fe",
    softText: "#6d28d9"
  },
  COMMON: {
    background: "#22a06b",
    border: "#178052",
    text: "#ffffff",
    soft: "#dcfce7",
    softText: "#166534"
  }
};
