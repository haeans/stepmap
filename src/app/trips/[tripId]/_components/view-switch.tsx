import Link from "next/link";

export type TripViewName = "schedule" | "map";

export function parseTripView(value: string | string[] | undefined): TripViewName {
  return value === "map" ? "map" : "schedule";
}

// 1화면(매거진)과 2화면(지도)을 오가는 전환 버튼 (02-FRONTEND.md 2절)
export function ViewSwitch({ tripId, current }: { tripId: string; current: TripViewName }) {
  const tabs: { view: TripViewName; label: string; href: string }[] = [
    { view: "schedule", label: "매거진", href: `/trips/${tripId}` },
    { view: "map", label: "지도", href: `/trips/${tripId}?view=map` },
  ];

  return (
    <nav aria-label="여행 화면" className="flex gap-1 rounded-md bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
      {tabs.map((tab) => (
        <Link
          key={tab.view}
          href={tab.href}
          aria-current={current === tab.view ? "page" : undefined}
          className={`rounded px-4 py-1.5 ${current === tab.view ? "bg-white font-medium shadow-sm dark:bg-zinc-700" : "text-zinc-600 dark:text-zinc-400"}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
