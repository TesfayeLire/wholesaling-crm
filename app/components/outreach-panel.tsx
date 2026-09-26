import Link from "next/link";
import { changeTemperature, completePropertyFollowUp, logContact } from "@/app/outreach-actions";
import { contactTypes, latestContact, lastContactLabel, temperatures, type Lead, type Person, type Outreach, type FollowTask } from "@/src/command-center";
import { calendarDate, displayDate } from "@/src/follow-up";
import { ActionForm, SubmitButton } from "./action-form";
import { Field, inputClass, linkClass, Section } from "./record-ui";

export function OutreachPanel({ property, contact, contacts = [], activities, tasks }: { property?: Lead; contact?: Person & { updatedAt: string }; contacts?: Person[]; activities: Outreach[]; tasks: FollowTask[] }) {
  const latest = latestContact(activities);
  const version = property?.updatedAt ?? contact!.updatedAt;
  const pending = tasks.filter(t => t.status === "PENDING" && (property ? t.propertyId === property.id : t.propertyId === null));
  return <div id="contact-log" className="space-y-6">
    <Section title="Contact & follow-up">
      <Link className={linkClass} href="/follow-ups">Return to follow-up queue</Link>
      <p className="font-medium">Last contacted: {lastContactLabel(latest)}</p>
      {latest && <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{latest.description}</p>}
      {property && <>
        <ActionForm key={version + "temperature"} action={changeTemperature} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={property.id}/><input type="hidden" name="updatedAt" value={version}/>
          <label className="block text-sm font-medium">Lead temperature<select name="temperature" defaultValue={property.temperature ?? ""} required className={inputClass}><option value="" disabled>Unclassified</option>{Object.entries(temperatures).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><SubmitButton>Save temperature</SubmitButton>
        </ActionForm>
        <p>Next follow-up: {property.nextAction ?? "No next action"} · {displayDate(property.nextActionDate)}</p>
        {(property.nextAction || property.nextActionDate) && <ActionForm action={completePropertyFollowUp}>
          <input type="hidden" name="id" value={property.id}/><input type="hidden" name="updatedAt" value={version}/><SubmitButton>Mark property follow-up complete</SubmitButton>
        </ActionForm>}
      </>}
      <details open><summary className="cursor-pointer font-semibold">Log contact & choose next step</summary>
        <ActionForm key={version + "outreach"} action={logContact} className="mt-4 space-y-4">
          <input type="hidden" name="updatedAt" value={version}/>
          {property ? <><input type="hidden" name="propertyId" value={property.id}/><label className="block text-sm font-medium">Contact (optional)<select name="contactId" defaultValue={contacts.length === 1 ? contacts[0].id : ""} className={inputClass}><option value="">Property only</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></label></> : <input type="hidden" name="contactId" value={contact!.id}/>}
          <label className="block text-sm font-medium">Contact result<select name="result" className={inputClass} defaultValue="CALL">{Object.entries(contactTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <Field name="note" label="Note (optional, up to 4,000 characters)" type="textarea"/>
          <details><summary className="cursor-pointer text-sm">Log an earlier contact (otherwise now)</summary><Field name="occurredAt" label="Contact date and time (UTC)" type="datetime-local"/></details>
          <label className="block text-sm font-medium">Next step<select name="followUpMode" defaultValue="unchanged" className={inputClass}><option value="unchanged">Log only — keep existing follow-up</option><option value="schedule">Schedule / reschedule next follow-up</option><option value="complete">Mark follow-up complete</option></select></label>
          {pending.length > 0 && <label className="block text-sm font-medium">{property ? "Also complete a pending task when scheduling/completing (optional)" : "Existing contact task to reschedule / complete"}<select name="taskChoice" defaultValue="" className={inputClass}><option value="">{property ? "No task" : "Create a new task when scheduling"}</option>{pending.map(t => <option key={t.id} value={`${t.id}|${t.updatedAt}`}>{t.title} — {displayDate(t.dueDate)}</option>)}</select></label>}
          <div className="grid gap-4 sm:grid-cols-2"><Field name="nextAction" label="Next action (when scheduling)" value={property?.nextAction}/><Field name="dueDate" label="Next follow-up date (when scheduling)" type="date" value={calendarDate(property?.nextActionDate)}/></div>
          <p className="text-xs text-slate-500">{property ? "Scheduling replaces this property's next action; it does not create a duplicate task." : "Scheduling uses your existing Tasks. Select a pending contact task to reschedule it."} Follow-up dates use Central Time.</p>
          <SubmitButton>Save contact & next step</SubmitButton>
        </ActionForm>
      </details>
    </Section>
  </div>;
}
