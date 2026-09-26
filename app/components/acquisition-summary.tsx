import Link from "next/link";
import type { getAcquisitions } from "@/src/acquisition-data";
import { offerStatuses, contractStatuses, type AcquisitionDeadline } from "@/src/acquisitions";
import { displayDate } from "@/src/follow-up";
import { formatMoney } from "@/src/deal-analysis";

export function DeadlineList({ deadlines, properties = [] }: { deadlines: AcquisitionDeadline[]; properties?: { id: number; address: string }[] }) {
  return !deadlines.length ? <p className="text-sm text-slate-500">No outstanding acquisition deadlines.</p> : <ul className="divide-y divide-slate-100">{deadlines.map(d => <li className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={d.key}><Link className="font-semibold underline" href={d.href}>{d.kind} · {properties.find(p => p.id === d.propertyId)?.address ?? `Record #${d.recordId}`}</Link><span className={d.status === "Overdue" ? "font-semibold text-red-800" : "text-slate-600"}>{d.kind === "Offer expiration" && d.status === "Overdue" ? "Expired" : d.status} · {displayDate(d.date)}</span></li>)}</ul>;
}
export function AcquisitionSummary({ data, compact = false }: { data: Awaited<ReturnType<typeof getAcquisitions>>; compact?: boolean }) {
  const counts = [["Pending / Countered Offers", data.pending.length], ["Accepted Offers", data.accepted.length], ["Active Contracts", data.active.length], ["Deadlines Due Today", data.dueToday.length], ["Overdue Deadlines", data.overdue.length], ["Upcoming Closings", data.upcomingClosings.length]] as const;
  return <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Acquisitions</h2>{compact && <Link className="font-semibold underline" href="/acquisitions">View all acquisitions</Link>}</div>
    <p className="text-sm text-slate-500">Contract deadlines · Central Time · Completion here means acquisition stage completed, not final closing.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{counts.map(([label, count]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-600">{label}</p><strong className="text-2xl">{count}</strong></div>)}</div>
    <DeadlineList deadlines={compact ? data.deadlines.slice(0, 6) : data.deadlines} properties={data.properties}/>
    {!compact && <div className="grid gap-5 md:grid-cols-2"><div><h3 className="font-semibold">Offers awaiting action</h3>{[...data.pending, ...data.accepted].length ? <ul className="space-y-2 pt-3">{[...data.pending, ...data.accepted].map(o => <li key={o.id}><Link className="text-sm underline" href={`/properties/${o.propertyId}#offer-${o.id}`}>{data.properties.find(p => p.id === o.propertyId)?.address} · {formatMoney(o.amount)} original · {offerStatuses[o.status as keyof typeof offerStatuses]}</Link></li>)}</ul> : <p className="text-sm text-slate-500">No Pending, Countered, or Accepted offers.</p>}</div><div><h3 className="font-semibold">Acquisition contracts</h3>{data.contracts.length ? <ul className="space-y-2 pt-3">{data.contracts.map(c => <li key={c.id}><Link className="text-sm underline" href={`/properties/${c.propertyId}#contract-${c.id}`}>{data.properties.find(p => p.id === c.propertyId)?.address} · {formatMoney(c.purchasePrice)} · {contractStatuses[c.status]}</Link></li>)}</ul> : <p className="text-sm text-slate-500">Accept an offer, then explicitly create its contract from the property.</p>}</div></div>}
  </section>;
}
