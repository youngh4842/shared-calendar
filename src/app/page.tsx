"use client";

import { useState } from "react";
import { CalendarView } from "@/components/Calendar/CalendarView";
import { UserSelector } from "@/components/UserSelector/UserSelector";
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
    <main className="min-h-screen bg-[var(--page-bg)] px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/85 px-4 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-medium text-emerald-700">2인용 공유 캘린더</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">우리 캘린더</h1>
          </div>
          <UserSelector user={user} onSelect={selectUser} />
        </header>

        {user ? (
          <CalendarView currentUser={user} />
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">사용자를 선택해주세요</h2>
            <p className="mt-2 text-sm text-slate-600">선택한 사용자는 이 브라우저에 저장됩니다.</p>
          </section>
        )}
      </div>
    </main>
  );
}
