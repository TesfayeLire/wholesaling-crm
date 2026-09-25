import { getContact } from "@/src/crm-data";
import { updateContact } from "@/app/actions";
import { RecordPage } from "@/app/components/record-ui";
import { ContactForm } from "@/app/components/record-forms";
export default async function EditContact({ params }: { params: Promise<{ id: string }> }) {
  const contact = await getContact((await params).id);
  return <RecordPage title="Edit contact" back={`/contacts/${contact.id}`}><ContactForm contact={contact} action={updateContact}/></RecordPage>;
}
