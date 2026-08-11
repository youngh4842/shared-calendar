import type { ScheduleType } from "@/types/schedule";

export const scheduleLabels: Record<ScheduleType, string> = {
  A: "A 일정",
  B: "B 일정",
  COMMON: "같이 일정"
};

export const scheduleColors: Record<ScheduleType, { background: string; border: string; text: string }> = {
  A: {
    background: "#2f80ed",
    border: "#1d63c7",
    text: "#ffffff"
  },
  B: {
    background: "#8b5cf6",
    border: "#6d3fe0",
    text: "#ffffff"
  },
  COMMON: {
    background: "#22a06b",
    border: "#178052",
    text: "#ffffff"
  }
};
