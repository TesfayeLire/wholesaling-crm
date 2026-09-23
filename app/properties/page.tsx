import Link from "next/link";
import { db } from "@/src/prisma/db";

export default async function PropertiesPage() {
  const properties = await db.orm.public.Property.all();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">
              Property lead management
            </p>
          </div>

          <Link
            href="/properties/new"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add Property
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="mt-2 text-slate-500">
            Track and manage the properties in your wholesaling pipeline.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search properties..."
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none sm:max-w-md"
          />

          <select
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            defaultValue="ALL"
          >
            <option value="ALL">All statuses</option>
            <option value="NEW_LEAD">New Lead</option>
            <option value="RESEARCHING">Researching</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="OFFER_MADE">Offer Made</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="UNDER_CONTRACT">Under Contract</option>
            <option value="DISPOSITION">Disposition</option>
            <option value="CLOSED">Closed</option>
            <option value="DEAD">Dead</option>
            <option value="NURTURE">Nurture / Follow-Up</option>
          </select>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Property</span>
            <span>Status</span>
            <span>Asking Price</span>
            <span>Next Action</span>
          </div>

          {properties.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold">No properties yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Add your first property lead to start building your pipeline.
              </p>
            </div>
          ) : (
            properties.map((property) => (
              <div
                key={property.id}
                className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-semibold">{property.address}</p>
                  <p className="text-slate-500">
                    {property.city}, {property.state} {property.zipCode}
                  </p>
                </div>

                <span>{property.status}</span>
                <span>{property.askingPrice}</span>
                <span>{property.nextAction}</span>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}