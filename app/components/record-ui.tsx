import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm, SubmitButton } from "./action-form";

export const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5";
export const linkClass = "inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold";
export function RecordPage({ title, back, children }: { title: string; back: string; children: ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
    <Link href={back} className={linkClass}>Back to {back.startsWith("/properties") ? "Properties" : back.startsWith("/contacts") ? "Contacts" : "Tasks"}</Link>
    <h1 className="text-3xl font-bold">{title}</h1>{children}
  </main>;
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>;
}
export function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string | null; type?: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}{required ? " *" : ""}</span>
    {type === "textarea" ? <textarea name={name} defaultValue={value ?? ""} rows={4} className={inputClass}/> :
      <input name={name} type={type} defaultValue={value ?? ""} required={required} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} className={inputClass}/>}
  </label>;
}
export function DeleteRecord({ id, action, name, explanation }: { id: number; action: (form: FormData) => Promise<void>; name: string; explanation: string }) {
  return <Section title="Delete record"><p className="text-sm text-slate-600">{explanation}</p>
    <ActionForm action={action} confirmMessage={`Permanently delete ${name}? ${explanation}`}>
      <input type="hidden" name="id" value={id}/>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" required name="confirm" value="DELETE"/>I confirm I want to permanently delete this record.</label>
      <SubmitButton>Delete record</SubmitButton>
    </ActionForm>
  </Section>;
}
export function ActivityHistory({ activities }: { activities: { id: number; createdAt: string; description: string }[] }) {
  const ordered = [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  return <Section title="Activity history">{ordered.length ? <ol className="space-y-3">{ordered.map(item => <li key={item.id} className="border-b border-slate-100 pb-3"><p>{item.description}</p><time className="text-xs text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time></li>)}</ol> : <p className="text-sm text-slate-500">No activity recorded yet.</p>}</Section>;
}
