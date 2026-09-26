import { db } from "./prisma/db";
import { commandCenter } from "./command-center";

export async function getCommandCenter() {
  const [properties, contacts, tasks, activities, links] = await Promise.all([
    db.orm.public.Property.all(), db.orm.public.Contact.all(), db.orm.public.Task.all(),
    db.orm.public.Activity.all(), db.orm.public.PropertyContact.all(),
  ]);
  return { ...commandCenter(properties, contacts, tasks, activities, links), properties, contacts };
}
