"use client";

import { CalendarView } from "@/components/Calendar/CalendarView";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <CalendarView />
      </div>
    </main>
  );
}
