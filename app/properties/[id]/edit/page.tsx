import { getProperty } from "@/src/crm-data";
import { updateProperty } from "@/app/actions";
import { RecordPage } from "@/app/components/record-ui";
import { PropertyForm } from "@/app/components/record-forms";
export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const property = await getProperty((await params).id);
  return <RecordPage title="Edit property" back={`/properties/${property.id}`}><PropertyForm property={property} action={updateProperty}/></RecordPage>;
}
