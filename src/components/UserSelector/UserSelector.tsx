import type { CalendarUser } from "@/types/schedule";

type Props = {
  user: CalendarUser | null;
  onSelect: (user: CalendarUser) => void;
};

export function UserSelector({ user, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:items-end">
      <p className="text-sm font-medium text-slate-700">현재 사용자: {user ?? "선택 전"}</p>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        {(["A", "B"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={[
              "h-10 rounded-md px-5 text-sm font-semibold transition",
              user === value ? "bg-slate-950 text-white shadow-sm" : "bg-transparent text-slate-700 hover:bg-white"
            ].join(" ")}
            aria-pressed={user === value}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
