import Link from "next/link";
import { createProperty } from "@/app/actions";

export default function NewPropertyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">Add a new property lead</p>
          </div>

          <Link
            href="/properties"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Back to Properties
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Add Property</h1>
          <p className="mt-2 text-slate-500">
            Enter the basic information for a new wholesaling lead.
          </p>
        </div>

        <form action={createProperty} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold">Property Information</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">
                  Street Address *
                </span>
                <input
                  name="address"
                  required
                  placeholder="123 Main St"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">City *</span>
                <input
                  name="city"
                  required
                  placeholder="Oklahoma City"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">State *</span>
                <input
                  name="state"
                  required
                  placeholder="OK"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">ZIP Code *</span>
                <input
                  name="zipCode"
                  required
                  placeholder="73102"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">County</span>
                <input
                  name="county"
                  placeholder="Oklahoma County"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">Lead Source</span>
                <select
                  name="source"
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5"
                >
                  <option value="">Select source</option>
                  <option value="Zillow">Zillow</option>
                  <option value="Propwire">Propwire</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Agent">Agent</option>
                  <option value="Investor">Investor</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Asking Price
                </span>
                <input
                  name="askingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="150000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold">Deal Information</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium">
                  Estimated Value
                </span>
                <input
                  name="estimatedValue"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="220000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Repair Estimate
                </span>
                <input
                  name="repairEstimate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="30000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Offer Amount
                </span>
                <input
                  name="offerAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="120000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">Status</span>
                <select
                  name="status"
                  defaultValue="NEW_LEAD"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5"
                >
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
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">
                  Next Action
                </span>
                <input
                  name="nextAction"
                  placeholder="Call seller to discuss offer"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Next Action Date
                </span>
                <input
                  name="nextActionDate"
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">Notes</span>
                <textarea
                  name="notes"
                  rows={5}
                  placeholder="Seller situation, property condition, important details..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/properties"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Save Property
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}