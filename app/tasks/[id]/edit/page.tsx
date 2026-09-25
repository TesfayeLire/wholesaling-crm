import { db } from "@/src/prisma/db";
import { getTask } from "@/src/crm-data";
import { updateTask, deleteTask } from "@/app/actions";
import { RecordPage, DeleteRecord } from "@/app/components/record-ui";
import { TaskForm } from "@/app/components/record-forms";
export default async function EditTask({ params }: { params: Promise<{ id: string }> }) {
  const task = await getTask((await params).id);
  const [properties, contacts] = await Promise.all([db.orm.public.Property.all(), db.orm.public.Contact.all()]);
  return <RecordPage title="Edit task" back="/tasks"><TaskForm task={task} properties={properties} contacts={contacts} action={updateTask}/>
    <DeleteRecord id={task.id} action={deleteTask} name={task.title} explanation="Only this task will be deleted. Its related property and contact will be preserved."/>
  </RecordPage>;
}
