import Link from "next/link";
import { type getCommandCenter } from "@/src/command-center-data";
import { attentionRules, lastContactLabel, temperatures, type QueueRow } from "@/src/command-center";
import { displayDate } from "@/src/follow-up";
import { setTaskStatus } from "@/app/actions";
import { completePropertyFollowUp } from "@/app/outreach-actions";
import { ActionForm, SubmitButton } from "./action-form";

type Data = Awaited<ReturnType<typeof getCommandCenter>>;
export function TemperatureBadge({ value }: { value: string | null }) {
  const label = value && Object.hasOwn(temperatures, value) ? temperatures[value as keyof typeof temperatures] : "Unclassified";
  return <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${value === "HOT" ? "bg-red-100 text-red-900" : value === "WARM" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{label}</span>;
}
function Queue({ title, id, rows }: { title: string; id: string; rows: QueueRow[] }) {
  return <section id={id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">{title} ({rows.length})</h2>
    {!rows.length ? <p className="text-sm text-slate-500">Nothing here right now.</p> : <ul className="divide-y divide-slate-100">{rows.map(row => <li key={row.key} className="space-y-2 py-4">
      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold break-words">{row.title}</p>{row.property && <TemperatureBadge value={row.property.temperature}/>}</div>
      <div className="flex flex-wrap gap-3 text-sm">{row.property && <Link className="underline" href={`/properties/${row.property.id}`}>{row.property.address}</Link>}{row.contact && <Link className="underline" href={`/contacts/${row.contact.id}`}>{row.contact.firstName} {row.contact.lastName}</Link>}{!row.property && !row.contact && <span>General task</span>}</div>
      <p className="text-sm text-slate-600">Due {displayDate(row.dueDate)} · Last contacted: {lastContactLabel(row.lastContact)}</p>
      {row.lastContact && <p className="text-sm text-slate-500 break-words">{row.lastContact.description}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {(row.property || row.contact) && <Link className="text-sm font-semibold underline" href={row.property ? `/properties/${row.property.id}#contact-log` : `/contacts/${row.contact!.id}#contact-log`}>Log contact / next step</Link>}
        {row.task ? <><Link className="text-sm underline" href={`/tasks/${row.task.id}/edit`}>Reschedule task</Link><ActionForm action={setTaskStatus}><input type="hidden" name="id" value={row.task.id}/><input type="hidden" name="updatedAt" value={row.task.updatedAt}/><input type="hidden" name="status" value="COMPLETED"/><SubmitButton>Complete task</SubmitButton></ActionForm></> : <ActionForm action={completePropertyFollowUp}><input type="hidden" name="id" value={row.property!.id}/><input type="hidden" name="updatedAt" value={row.property!.updatedAt}/><SubmitButton>Complete follow-up</SubmitButton></ActionForm>}
      </div>
    </li>)}</ul>}
  </section>;
}
export function CommandCenter({ data, compact = false }: { data: Data; compact?: boolean }) {
  const counts = [["Due Today", "due-today", data.dueToday.length], ["Overdue", "overdue", data.overdue.length], ["Hot Leads", "hot-leads", data.hot.length], ["Needs Attention", "needs-attention", data.attention.length], ["Upcoming Follow-Ups", "upcoming", data.upcoming.length]] as const;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Daily follow-up</h2><p className="text-sm text-slate-500">{displayDate(data.today)} · Central Time · Property next actions and pending tasks</p></div>{compact && <Link href="/follow-ups" className="font-semibold underline">Open command center</Link>}</div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{counts.map(([label, id, count]) => <Link href={`/follow-ups#${id}`} key={id} className="rounded-xl border border-slate-200 bg-white p-4"><span className="block text-sm">{label}</span><strong className="text-2xl">{count}</strong></Link>)}</div>
    {compact ? <><Queue title="Work on these first" id="daily-priority" rows={[...data.overdue, ...data.dueToday].slice(0, 5)}/>{data.attention.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Hot leads needing attention</h3>{data.attention.slice(0, 3).map(item => <p key={item.property.id} className="mt-2 text-sm"><Link className="font-semibold underline" href={`/properties/${item.property.id}#contact-log`}>{item.property.address}</Link> — {item.reasons.join("; ")}</p>)}</div>}</> : <>
      <nav className="flex flex-wrap gap-4 text-sm underline" aria-label="Follow-up groups">{counts.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}<a href="#recently-contacted">Recently Contacted</a></nav>
      <div className="grid items-start gap-5 xl:grid-cols-2"><Queue title="Overdue" id="overdue" rows={data.overdue}/><Queue title="Due Today" id="due-today" rows={data.dueToday}/></div>
      <section id="needs-attention" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">Needs Attention ({data.attention.length})</h2><p className="text-sm text-slate-500">Hot leads: overdue follow-up, no follow-up today or later, or no contact in {attentionRules.hotContactDays} days.</p>{!data.attention.length ? <p>No Hot leads need attention.</p> : data.attention.map(item => <div key={item.property.id} className="border-t border-slate-100 pt-3"><Link className="font-semibold underline" href={`/properties/${item.property.id}#contact-log`}>{item.property.address}</Link><ul className="list-inside list-disc text-sm text-slate-600">{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="text-sm">Last contacted: {lastContactLabel(item.lastContact, data.today)}</p></div>)}</section>
      <Queue title="Upcoming" id="upcoming" rows={data.upcoming}/>
      <details id="hot-leads" className="rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">All Hot Leads ({data.hot.length})</summary><ul className="mt-3 space-y-2">{data.hot.map(p => <li key={p.id}><Link className="underline" href={`/properties/${p.id}#contact-log`}>{p.address}</Link></li>)}</ul>{!data.hot.length && <p>No active Hot leads.</p>}</details>
      <section id="recently-contacted" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">Recently Contacted</h2><p className="text-sm text-slate-500">Outreach in the last {attentionRules.recentContactDays} calendar days. Call attempts count as contact.</p>{!data.recent.length ? <p>No recent contact logged.</p> : data.recent.map(event => <div key={event.id} className="space-y-1 border-t border-slate-100 pt-3"><p className="break-words whitespace-pre-wrap">{event.description}</p><p className="text-xs text-slate-500">{new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))} Central</p><div className="flex flex-wrap gap-4 text-sm">{event.propertyId && <Link className="underline" href={`/properties/${event.propertyId}`}>{data.properties.find(p => p.id === event.propertyId)?.address ?? "Property"}</Link>}{event.contactId && <Link className="underline" href={`/contacts/${event.contactId}`}>{data.contacts.find(c => c.id === event.contactId)?.firstName ?? "Contact"}</Link>}{!event.propertyId && !event.contactId && <span>Related records deleted; history retained.</span>}</div></div>)}</section>
    </>}
  </div>;
}
