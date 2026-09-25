import Link from "next/link";
import { db } from "@/src/prisma/db";
import { getContact } from "@/src/crm-data";
import { deleteContact, linkContact } from "@/app/actions";
import { RecordPage, Section, DeleteRecord, ActivityHistory, linkClass, inputClass, Field } from "@/app/components/record-ui";
import { ActionForm, SubmitButton } from "@/app/components/action-form";
import { TaskList } from "@/app/components/task-list";

export default async function ContactDetail({ params }: { params: Promise<{ id: string }> }) {
  const contact = await getContact((await params).id);
  const [links, properties, tasks, activities] = await Promise.all([
    db.orm.public.PropertyContact.where({ contactId: contact.id }).all(),
    db.orm.public.Property.all(), db.orm.public.Task.where({ contactId: contact.id }).all(),
    db.orm.public.Activity.where({ contactId: contact.id }).all(),
  ]);
  const name = `${contact.firstName} ${contact.lastName ?? ""}`.trim();
  return <RecordPage title={name} back="/contacts">
    <Link className={linkClass} href={`/contacts/${contact.id}/edit`}>Edit contact</Link>
    <Section title="Contact details"><dl className="grid gap-5 sm:grid-cols-2">{[["First name", contact.firstName], ["Last name", contact.lastName], ["Phone", contact.phone], ["Email", contact.email], ["Notes", contact.notes]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words">{value ?? "—"}</dd></div>)}</dl></Section>
    <Section title="Properties">{links.length ? <ul className="space-y-3">{links.map(link => {
      const property = properties.find(p => p.id === link.propertyId);
      return property && <li key={link.id}><Link className="font-semibold underline" href={`/properties/${property.id}`}>{property.address}, {property.city}</Link><span className="ml-3 text-sm text-slate-500">{link.role ?? "No role set"}</span></li>;
    })}</ul> : <p>No properties linked.</p>}
      {properties.length > 0 ? <ActionForm action={linkContact}>
        <input type="hidden" name="contactId" value={contact.id}/><input type="hidden" name="from" value="contact"/>
        <label className="block"><span className="mb-2 block text-sm font-medium">Link existing property / update role</span><select required name="propertyId" defaultValue="" className={inputClass}><option value="" disabled>Select property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.address}, {p.city} (#{p.id})</option>)}</select></label>
        <Field name="role" label="Role (Seller, Owner, Agent, or any other label)"/>
        <SubmitButton>Save relationship</SubmitButton>
      </ActionForm> : <Link href="/properties/new" className={linkClass}>Create property</Link>}
    </Section>
    <Section title="Tasks"><Link className={linkClass} href="/tasks/new">Create task</Link><TaskList tasks={tasks} properties={properties} contacts={[contact]}/></Section>
    <ActivityHistory activities={activities}/>
    <DeleteRecord id={contact.id} action={deleteContact} name={name} explanation="Linked properties, tasks and activity history will be preserved. This contact's links will be removed."/>
  </RecordPage>;
}
