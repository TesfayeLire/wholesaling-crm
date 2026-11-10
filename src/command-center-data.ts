import { db } from "./prisma/db";
import { commandCenter } from "./command-center";
import { readRows, safeDbQuery } from "./db-safety";

export async function getCommandCenter() {
  return safeDbQuery("command-center-data", async () => {
    const [properties, contacts, tasks, activities, links] = await Promise.all([
      readRows(db.orm.public.Property.all()),
      readRows(db.orm.public.Contact.all()),
      readRows(db.orm.public.Task.all()),
      readRows(db.orm.public.Activity.all()),
      readRows(db.orm.public.PropertyContact.all()),
    ]);
    return { ...commandCenter(properties, contacts, tasks, activities, links), properties, contacts };
  }, { ...commandCenter([], [], [], [], []), properties: [], contacts: [] });
}
