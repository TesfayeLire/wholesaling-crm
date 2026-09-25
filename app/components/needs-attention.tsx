import Link from "next/link";
import type { Property } from "@/src/crm-data";
import { attentionOrder, displayDate, followUpStatus, todayDate } from "@/src/follow-up";
export function NeedsAttention({ properties }: { properties: Property[] }) {
  const today = todayDate();
  const ordered = attentionOrder(properties);
  return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Needs Attention</h2><Link href="/properties" className="text-sm underline">All properties</Link></div>
    <p className="mt-1 text-sm text-slate-500">Overdue first, then today and upcoming · {displayDate(today)}, Central Time</p>
    {ordered.length ? <ul className="mt-4 divide-y divide-slate-100">{ordered.slice(0, 10).map(p => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><Link href={`/properties/${p.id}#follow-up`} className="font-semibold underline">{p.address}</Link><p className="text-sm text-slate-600">{p.nextAction || "Choose a next action"}</p></div>
      <div className="text-sm"><p className={followUpStatus(p.nextActionDate, today) === "Overdue" ? "font-semibold text-red-700" : "font-medium"}>{followUpStatus(p.nextActionDate, today)}</p>{p.nextActionDate && <p className="text-slate-500">{displayDate(p.nextActionDate)}</p>}</div>
    </li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No active properties.</p>}
    {ordered.length > 10 && <p className="mt-3 text-sm text-slate-500">Showing the first 10 of {ordered.length} active properties.</p>}
  </section>;
}
