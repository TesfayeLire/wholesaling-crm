import Link from "next/link";
import { db } from "@/src/prisma/db";

export default async function ContactsPage() {
  const contacts = await db.orm.public.Contact.all();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">
              Seller and contact management
            </p>
          </div>

          <Link
            href="/contacts/new"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add Contact
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="mt-2 text-slate-500">
            Keep track of sellers and other contacts connected to your deals.
          </p>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.5fr_1fr_1.5fr_2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Name</span>
            <span>Phone</span>
            <span>Email</span>
            <span>Notes</span>
          </div>

          {contacts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold">No contacts yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Add your first seller or contact to start building your contact list.
              </p>
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="grid grid-cols-[1.5fr_1fr_1.5fr_2fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0"
              >
                <span className="font-semibold">
                  {contact.firstName} {contact.lastName ?? ""}
                </span>
                <span>{contact.phone ?? "—"}</span>
                <span>{contact.email ?? "—"}</span>
                <span>{contact.notes ?? "—"}</span>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}