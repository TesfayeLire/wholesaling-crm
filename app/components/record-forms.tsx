import Link from "next/link";
import type { Contact, Property, Task } from "@/src/crm-data";
import { pipelineStatuses } from "@/src/crm-input";
import { stageLabels } from "@/src/pipeline";
import { ActionForm, SubmitButton } from "./action-form";
import { Field, Section, inputClass, linkClass } from "./record-ui";

type Action = (form: FormData) => Promise<void>;
export function PropertyForm({ property, action }: { property: Property; action: Action }) {
  return <ActionForm action={action}><input type="hidden" name="id" value={property.id}/><input type="hidden" name="updatedAt" value={property.updatedAt}/>
    <Section title="Property information"><div className="grid gap-5 md:grid-cols-2">
      <Field name="address" label="Street address" value={property.address} required/>
      <Field name="city" label="City" value={property.city} required/>
      <Field name="state" label="State" value={property.state} required/>
      <Field name="zipCode" label="ZIP code" value={property.zipCode} required/>
      <Field name="county" label="County" value={property.county}/>
      <Field name="source" label="Source" value={property.source}/>
      <Field name="askingPrice" label="Asking price" value={property.askingPrice} type="number"/>
      <Field name="estimatedValue" label="Estimated value" value={property.estimatedValue} type="number"/>
      <Field name="repairEstimate" label="Repair estimate" value={property.repairEstimate} type="number"/>
      <Field name="offerAmount" label="Offer amount" value={property.offerAmount} type="number"/>
      <label><span className="mb-2 block text-sm font-medium">Pipeline status</span><select name="status" defaultValue={property.status} className={inputClass}>{pipelineStatuses.map(status => <option key={status} value={status}>{stageLabels[status]}</option>)}</select></label>
      <Field name="nextAction" label="Next action" value={property.nextAction}/>
      <Field name="nextActionDate" label="Follow-up date" value={property.nextActionDate?.slice(0, 10)} type="date"/>
      <Field name="notes" label="Notes" value={property.notes} type="textarea"/>
    </div></Section>
    <div className="flex gap-3"><SubmitButton>Save property</SubmitButton><Link className={linkClass} href={`/properties/${property.id}`}>Cancel</Link></div>
  </ActionForm>;
}
export function ContactForm({ contact, action }: { contact: Contact; action: Action }) {
  return <ActionForm action={action}><input type="hidden" name="id" value={contact.id}/>
    <Section title="Contact information"><div className="grid gap-5 md:grid-cols-2">
      <Field name="firstName" label="First name" value={contact.firstName} required/>
      <Field name="lastName" label="Last name" value={contact.lastName}/>
      <Field name="phone" label="Phone" value={contact.phone} type="tel"/>
      <Field name="email" label="Email" value={contact.email} type="email"/>
      <Field name="notes" label="Notes" value={contact.notes} type="textarea"/>
    </div></Section>
    <div className="flex gap-3"><SubmitButton>Save contact</SubmitButton><Link className={linkClass} href={`/contacts/${contact.id}`}>Cancel</Link></div>
  </ActionForm>;
}
export function TaskRelations({ properties, contacts, task }: { properties: Property[]; contacts: Contact[]; task?: Task }) {
  return <div className="grid gap-5 md:grid-cols-2">
    <label><span className="mb-2 block text-sm font-medium">Related property</span><select name="propertyId" defaultValue={task?.propertyId ?? ""} className={inputClass}><option value="">No property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.address}, {p.city} (#{p.id})</option>)}</select></label>
    <label><span className="mb-2 block text-sm font-medium">Related contact</span><select name="contactId" defaultValue={task?.contactId ?? ""} className={inputClass}><option value="">No contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} (#{c.id})</option>)}</select></label>
  </div>;
}
export function TaskForm({ task, properties, contacts, action }: { task: Task; properties: Property[]; contacts: Contact[]; action: Action }) {
  return <ActionForm action={action}><input type="hidden" name="id" value={task.id}/><input type="hidden" name="updatedAt" value={task.updatedAt}/>
    <Section title="Task information">
      <Field name="title" label="Title" value={task.title} required/>
      <Field name="description" label="Description" value={task.description} type="textarea"/>
      <Field name="dueDate" label="Due date" value={task.dueDate?.slice(0, 10)} type="date"/>
      <label className="block"><span className="mb-2 block text-sm font-medium">Status</span><select name="status" defaultValue={task.status} className={inputClass}><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option></select></label>
      <TaskRelations properties={properties} contacts={contacts} task={task}/>
    </Section>
    <div className="flex gap-3"><SubmitButton>Save task</SubmitButton><Link href="/tasks" className={linkClass}>Cancel</Link></div>
  </ActionForm>;
}
