import { connection } from "next/server";
import Link from "next/link";
import { db } from "@/src/prisma/db";
import type { Property } from "@/src/crm-data";
import type { PipelineStatus } from "@/src/crm-input";
import { allStages, legacyStages, stageLabels, workflowStages } from "@/src/pipeline";
import { displayDate, followUpStatus } from "@/src/follow-up";
import { changePropertyStage } from "@/app/property-workflow-actions";
import { ActionForm, SubmitButton } from "@/app/components/action-form";
import { PropertyVersion } from "@/app/components/property-workflow";

function Stage({ stage, properties }: { stage: PipelineStatus; properties: Property[] }) {
  const rows = properties.filter(p => p.status === stage);
  return <section className="w-72 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">{stageLabels[stage]}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{rows.length}</span></div>
    <div className="space-y-3 p-3">{rows.length ? rows.map(property => <div key={property.id} className="rounded-lg border border-slate-200 p-4">
      <Link className="font-semibold underline" href={`/properties/${property.id}`}>{property.address}</Link>
      <p className="mt-1 text-sm text-slate-500">{property.city}, {property.state}</p>
      <p className="mt-3 text-xs text-slate-600">{property.nextAction || "No next action"}</p>
      <p className="mt-1 text-xs text-slate-500">{followUpStatus(property.nextActionDate)}{property.nextActionDate ? " · " + displayDate(property.nextActionDate) : ""}</p>
      <ActionForm key={property.updatedAt} action={changePropertyStage} className="mt-4 space-y-2"><PropertyVersion property={property}/>
        <label className="block text-xs font-medium">Move to<select name="status" defaultValue={property.status} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{allStages.map(option => <option key={option} value={option}>{stageLabels[option]}</option>)}</select></label>
        <SubmitButton>Update Stage</SubmitButton>
      </ActionForm>
    </div>) : <p className="px-3 py-8 text-center text-sm text-slate-400">No properties</p>}</div>
  </section>;
}
export default async function PipelinePage() {
  await connection();
  const properties = await db.orm.public.Property.all();
  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div><p className="text-xl font-bold">Wholesaling CRM</p><p className="text-sm text-slate-500">Deal pipeline</p></div><Link href="/properties/new" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">+ Add Property</Link></div></header>
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8"><div><h1 className="text-3xl font-bold">Pipeline</h1><p className="mt-2 text-slate-500">Track each property through your wholesaling process.</p></div>
      <div className="flex gap-5 overflow-x-auto pb-6">{workflowStages.map(stage => <Stage key={stage} stage={stage} properties={properties}/>)}</div>
      {properties.some(p => legacyStages.includes(p.status)) && <section><h2 className="mb-2 text-lg font-semibold">Additional existing stages</h2><p className="mb-4 text-sm text-slate-500">These records retain their original stages. Move them only when you choose.</p><div className="flex gap-5 overflow-x-auto pb-4">{legacyStages.filter(stage => properties.some(p => p.status === stage)).map(stage => <Stage key={stage} stage={stage} properties={properties}/>)}</div></section>}
      <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold">Dead / Not a Deal ({properties.filter(p => p.status === "DEAD").length})</summary><div className="mt-4 overflow-x-auto"><Stage stage="DEAD" properties={properties}/></div></details>
    </main>
  </div>;
}
