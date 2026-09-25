import { connection } from "next/server";
import Link from "next/link";
import { db } from "@/src/prisma/db";
import { updatePropertyStatus } from "@/app/actions";

const stages = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "RESEARCHING", label: "Researching" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "OFFER_MADE", label: "Offer Made" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "UNDER_CONTRACT", label: "Under Contract" },
  { value: "DISPOSITION", label: "Disposition" },
  { value: "CLOSED", label: "Closed" },
  { value: "NURTURE", label: "Nurture" },
  { value: "DEAD", label: "Dead" },
] as const;

export default async function PipelinePage() {
  await connection();
  const properties = await db.orm.public.Property.all();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">Deal pipeline</p>
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
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="mt-2 text-slate-500">
            Track every property through your wholesaling process.
          </p>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-6">
          {stages.map((stage) => {
            const stageProperties = properties.filter(
              (property) => property.status === stage.value,
            );

            return (
              <section
                key={stage.value}
                className="w-72 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-semibold">{stage.label}</h2>

                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                    {stageProperties.length}
                  </span>
                </div>

                <div className="space-y-3 p-3">
                  {stageProperties.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-400">
                      No properties
                    </div>
                  ) : (
                    stageProperties.map((property) => (
                      <div
                        key={property.id}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <p className="font-semibold">{property.address}</p>

                        <p className="mt-1 text-sm text-slate-500">
                          {property.city}, {property.state}
                        </p>

                        {property.nextAction && (
                          <p className="mt-3 text-xs text-slate-600">
                            Next: {property.nextAction}
                          </p>
                        )}

                        <form
                          action={updatePropertyStatus}
                          className="mt-4"
                        >
                          <input
                            type="hidden"
                            name="propertyId"
                            value={property.id}
                          />

                          <label className="block text-xs font-medium text-slate-500">
                            Move to
                          </label>

                          <select
                            name="status"
                            defaultValue={property.status}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            {stages.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="submit"
                            className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Update Stage
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
