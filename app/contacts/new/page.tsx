import Link from "next/link";
import { createContact } from "@/app/actions";

export default function NewContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">Add a new contact</p>
          </div>

          <Link
            href="/contacts"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Back to Contacts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Add Contact</h1>
          <p className="mt-2 text-slate-500">
            Add a seller or other contact for your wholesaling leads.
          </p>
        </div>

        <form action={createContact} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold">
              Contact Information
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium">
                  First Name *
                </span>
                <input
                  name="firstName"
                  required
                  placeholder="John"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Last Name
                </span>
                <input
                  name="lastName"
                  placeholder="Smith"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Phone
                </span>
                <input
                  name="phone"
                  type="tel"
                  placeholder="580-555-0123"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">
                  Notes
                </span>
                <textarea
                  name="notes"
                  rows={5}
                  placeholder="Seller situation, best time to call, important details..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/contacts"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Save Contact
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}