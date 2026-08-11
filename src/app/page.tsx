"use client";

import { useState } from "react";
import { CalendarView } from "@/components/Calendar/CalendarView";
import type { CalendarUser } from "@/types/schedule";

const STORAGE_KEY = "calendarUser";

export default function Home() {
  const [user, setUser] = useState<CalendarUser | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "A" || saved === "B" ? saved : null;
  });

  function selectUser(nextUser: CalendarUser) {
    window.localStorage.setItem(STORAGE_KEY, nextUser);
    setUser(nextUser);
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <CalendarView currentUser={user} onSelectUser={selectUser} />
      </div>
    </main>
  );
}
