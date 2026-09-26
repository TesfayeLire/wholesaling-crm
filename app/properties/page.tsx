import { TemperatureBadge } from "@/app/components/command-center";
import { stageLabels } from "@/src/pipeline";
import { displayDate, followUpStatus } from "@/src/follow-up";
import Link from "next/link";
import { db } from "@/src/prisma/db";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim();
  const status = typeof params.status === "string" ? params.status : "ALL";
  const properties = (await db.orm.public.Property.all()).filter(property =>
    (!q || [property.address, property.city, property.state, property.zipCode, property.county].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())) &&
    (status === "ALL" || !status || property.status === status)
  );

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

        <form method="get" className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="search" name="q" defaultValue={q} aria-label="Search properties by address or location"
            placeholder="Search properties..."
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none sm:max-w-md"
          />

          <select
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            name="status" aria-label="Pipeline status" defaultValue={status}
          >
            <option value="ALL">All statuses</option>
            <option value="NEW_LEAD">New Lead</option>
            <option value="RESEARCHING">Researching</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified (existing stage)</option>
            <option value="OFFER_MADE">Offer Made</option>
            <option value="NEGOTIATING">Negotiating (existing stage)</option>
            <option value="UNDER_CONTRACT">Under Contract</option>
            <option value="DISPOSITION">Marketing to Buyers</option>
            <option value="CLOSED">Assigned / Closed</option>
            <option value="DEAD">Dead / Not a Deal</option>
            <option value="NURTURE">Follow-Up</option>
          </select>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">Search / Filter</button>
          <Link href="/properties" className="px-4 py-2 text-sm underline">Clear</Link>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Property</span>
            <span>Status</span>
            <span>Asking Price</span>
            <span>Next Action</span>
          </div>

          {properties.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold">No matching properties</p>
              <p className="mt-2 text-sm text-slate-500">
                Try another search or status, or add a new property.
              </p>
            </div>
          ) : (
            properties.map((property) => (
              <div
                key={property.id}
                className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <Link className="font-semibold underline" href={`/properties/${property.id}`}>{property.address}</Link>
                  <p className="text-slate-500">
                    {property.city}, {property.state} {property.zipCode}
                  </p>
                </div>

                <div><p>{stageLabels[property.status]}</p><TemperatureBadge value={property.temperature}/></div>
                <span>{property.askingPrice}</span>
                <div><p>{property.nextAction || "No next action"}</p><p className="text-xs text-slate-500">{followUpStatus(property.nextActionDate)}{property.nextActionDate ? " · " + displayDate(property.nextActionDate) : ""}</p></div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
