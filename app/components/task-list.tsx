import Link from "next/link";
import type { Task, Property, Contact } from "@/src/crm-data";
import { dateLabel } from "@/src/crm-data";
import { setTaskStatus } from "@/app/actions";
import { ActionForm, SubmitButton } from "./action-form";

export function TaskList({ tasks, properties, contacts }: { tasks: Task[]; properties: Property[]; contacts: Contact[] }) {
  return tasks.length ? <div className="divide-y divide-slate-100">{tasks.map(task => {
    const property = properties.find(p => p.id === task.propertyId);
    const contact = contacts.find(c => c.id === task.contactId);
    return <div key={task.id} className="grid gap-4 px-5 py-4 text-sm md:grid-cols-[2fr_1fr_1fr_1.5fr]">
      <div><Link href={`/tasks/${task.id}/edit`} className="font-semibold underline">{task.title}</Link><p className="whitespace-pre-wrap text-slate-500">{task.description}</p></div>
      <span>{task.dueDate ? `Due ${dateLabel(task.dueDate)}` : "No due date"}</span>
      <div className="space-y-2"><p>{task.status === "COMPLETED" ? "Completed" : "Pending"}</p><ActionForm action={setTaskStatus}>
        <input type="hidden" name="id" value={task.id}/><input type="hidden" name="updatedAt" value={task.updatedAt}/><input type="hidden" name="status" value={task.status === "COMPLETED" ? "PENDING" : "COMPLETED"}/>
        <SubmitButton>{task.status === "COMPLETED" ? "Reopen" : "Complete"}</SubmitButton>
      </ActionForm></div>
      <div className="space-y-2">{property && <Link className="block underline" href={`/properties/${property.id}`}>{property.address}</Link>}{contact && <Link className="block underline" href={`/contacts/${contact.id}`}>{contact.firstName} {contact.lastName}</Link>}{!task.propertyId && !task.contactId && <span>General task</span>}<Link className="block underline" href={`/tasks/${task.id}/edit`}>Edit / Delete</Link></div>
    </div>;
  })}</div> : <p className="p-6 text-sm text-slate-500">No matching tasks.</p>;
}
