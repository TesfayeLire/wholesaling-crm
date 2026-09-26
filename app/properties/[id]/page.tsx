import { AcquisitionPanel } from "@/app/components/acquisition-panel";
import { OutreachPanel } from "@/app/components/outreach-panel";
import { PropertyWorkflow } from "@/app/components/property-workflow";
import { stageLabels } from "@/src/pipeline";
import Link from "next/link";
import { db } from "@/src/prisma/db";
import { getProperty, dateLabel } from "@/src/crm-data";
import { deleteProperty, linkContact } from "@/app/actions";
import { RecordPage, Section, DeleteRecord, ActivityHistory, linkClass, inputClass, Field } from "@/app/components/record-ui";
import { ActionForm, SubmitButton } from "@/app/components/action-form";
import { TaskList } from "@/app/components/task-list";

export default async function PropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const property = await getProperty((await params).id);
  const [links, contacts, tasks, activities, offers, contracts] = await Promise.all([
    db.orm.public.PropertyContact.where({ propertyId: property.id }).all(),
    db.orm.public.Contact.all(), db.orm.public.Task.where({ propertyId: property.id }).all(),
    db.orm.public.Activity.where({ propertyId: property.id }).all(),
    db.orm.public.Offer.where({ propertyId: property.id }).all(),
    db.orm.public.AcquisitionContract.where({ propertyId: property.id }).all(),
  ]);
  const fields = [
    ["Address", property.address], ["City", property.city], ["State", property.state], ["ZIP code", property.zipCode],
    ["County", property.county], ["Source", property.source], ["Asking price", property.askingPrice],
    ["Estimated value", property.estimatedValue], ["Repair estimate", property.repairEstimate], ["Legacy offer amount", property.offerAmount],
    ["Pipeline status", stageLabels[property.status]], ["Next action", property.nextAction],
    ["Next action date", dateLabel(property.nextActionDate)], ["Notes", property.notes],
  ];
  return <RecordPage title={property.address} back="/properties">
    <Link className={linkClass} href={`/properties/${property.id}/edit`}>Edit property</Link>
    <nav aria-label="Property workflow" className="flex flex-wrap gap-4 text-sm underline"><a href="#contact-log">Contact / follow-up</a><a href="#deal-analysis">Deal analysis</a><a href="#offers">Offers</a><a href="#acquisitions">Acquisition deadlines / contracts</a></nav>
    <OutreachPanel property={property} contacts={contacts.filter(c => links.some(l => l.contactId === c.id))} activities={activities} tasks={tasks}/>
    <PropertyWorkflow property={property}/>
    <AcquisitionPanel property={property} contacts={contacts.filter(c => links.some(l => l.contactId === c.id))} offers={offers} contracts={contracts}/>
    <Section title="Property details"><dl className="grid gap-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words">{value ?? "—"}</dd></div>)}</dl></Section>
    <Section title="Contacts">{links.length ? <ul className="space-y-3">{links.map(link => {
      const contact = contacts.find(c => c.id === link.contactId);
      return contact && <li key={link.id}><Link className="font-semibold underline" href={`/contacts/${contact.id}`}>{contact.firstName} {contact.lastName}</Link><span className="ml-3 text-sm text-slate-500">{link.role ?? "No role set"}</span></li>;
    })}</ul> : <p>No contacts linked.</p>}
      {contacts.length > 0 ? <ActionForm action={linkContact}>
        <input type="hidden" name="propertyId" value={property.id}/>
        <label className="block"><span className="mb-2 block text-sm font-medium">Link existing contact / update role</span><select required name="contactId" defaultValue="" className={inputClass}><option value="" disabled>Select contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} (#{c.id})</option>)}</select></label>
        <Field name="role" label="Role (Seller, Owner, Agent, or any other label)"/>
        <SubmitButton>Save relationship</SubmitButton>
      </ActionForm> : <Link href="/contacts/new" className={linkClass}>Create contact</Link>}
    </Section>
    <Section title="Tasks"><Link className={linkClass} href="/tasks/new">Create task</Link><TaskList tasks={tasks} properties={[property]} contacts={contacts}/></Section>
    <ActivityHistory activities={activities}/>
    {offers.length || contracts.length ? <Section title="Record retention"><p className="text-sm text-slate-600">This property has acquisition history and cannot be deleted. Offers and contracts are retained; use an inactive pipeline stage when appropriate.</p></Section> : <DeleteRecord id={property.id} action={deleteProperty} name={property.address} explanation="Linked contacts, tasks and activity history will be preserved. This property's links will be removed."/>}
  </RecordPage>;
}
