import Link from "next/link";
import { db } from "@/src/prisma/db";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim();
  const digits = q.replace(/\D/g, "");
  const contacts = (await db.orm.public.Contact.all()).filter(contact =>
    !q || [contact.firstName, contact.lastName, contact.phone, contact.email].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()) ||
    (digits.length > 0 && /^[+()\d\s.-]+$/.test(q) && (contact.phone ?? "").replace(/\D/g, "").includes(digits))
  );

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

        <form method="get" className="mb-6 flex flex-wrap gap-3">
          <input type="search" name="q" defaultValue={q} aria-label="Search contacts by name, phone or email" placeholder="Name, phone or email" className="rounded-lg border border-slate-300 bg-white px-4 py-2"/>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">Search</button>
          <Link href="/contacts" className="px-4 py-2 text-sm underline">Clear</Link>
        </form>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.5fr_1fr_1.5fr_2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Name</span>
            <span>Phone</span>
            <span>Email</span>
            <span>Notes</span>
          </div>

          {contacts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold">No matching contacts</p>
              <p className="mt-2 text-sm text-slate-500">
                Try another search, or add a new contact.
              </p>
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="grid grid-cols-[1.5fr_1fr_1.5fr_2fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0"
              >
                <Link className="font-semibold underline" href={`/contacts/${contact.id}`}>
                  {contact.firstName} {contact.lastName ?? ""}
                </Link>
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
