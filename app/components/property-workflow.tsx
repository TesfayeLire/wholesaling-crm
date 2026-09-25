import type { Property } from "@/src/crm-data";
import { calculateAnalysis, formatMoney } from "@/src/deal-analysis";
import { dealReadiness, recommendedAction } from "@/src/deal-readiness";
import { calendarDate, displayDate, followUpStatus, todayDate } from "@/src/follow-up";
import { allStages, stageLabels } from "@/src/pipeline";
import { saveAnalysis, saveFollowUp, saveMotivation, addPropertyNote, changePropertyStage } from "@/app/property-workflow-actions";
import { ActionForm, SubmitButton } from "./action-form";
import { Field, Section, inputClass, linkClass } from "./record-ui";

export function PropertyVersion({ property }: { property: Property }) {
  return <><input type="hidden" name="id" value={property.id}/><input type="hidden" name="updatedAt" value={property.updatedAt}/></>;
}
function Amount({ name, label, value, percentage = false }: { name: string; label: string; value: string | null; percentage?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input className={inputClass} type="number" name={name} defaultValue={value ?? ""} min={percentage ? "0.01" : "0"} max={percentage ? "100" : undefined} step="0.01"/></label>;
}
export function PropertyWorkflow({ property }: { property: Property }) {
  const analysis = calculateAnalysis(property);
  const today = todayDate();
  return <>
    <nav aria-label="Property quick actions" className="flex flex-wrap gap-2">
      <a className={linkClass} href="#deal-analysis">Edit Deal Analysis</a><a className={linkClass} href="#follow-up">Add / Edit Follow-Up</a>
      <a className={linkClass} href="#add-note">Add Note</a><a className={linkClass} href="#change-stage">Change Stage</a>
    </nav>
    <Section title="Recommended Next Action"><p className="font-medium">{recommendedAction(property, today)}</p><p className="text-sm text-slate-500">Based on your scheduled follow-up and missing information. You choose what to do.</p></Section>
    <div id="deal-analysis" className="scroll-mt-6"><Section title="Deal Analysis">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
        ["ARV", formatMoney(property.arv)], ["Estimated repairs", formatMoney(property.repairEstimate)],
        ["Desired assignment fee", formatMoney(property.assignmentFee)], ["Buyer percentage", property.buyerPercentage === null ? "Not entered" : property.buyerPercentage + "%"],
        ["Estimated MAO", analysis ? formatMoney(analysis.mao) : "Complete the inputs below"], ["Seller asking price", formatMoney(property.askingPrice)],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="break-words text-lg font-semibold">{value}</dd></div>)}</dl>
      <p className="rounded-lg bg-slate-50 p-3 font-medium">{analysis?.difference !== null && analysis?.difference !== undefined ?
        analysis.position === "equal" ? "Asking price equals estimated MAO." : formatMoney(analysis.difference.replace("-", "")) + " " + analysis.position + " estimated MAO" :
        "Enter asking price and complete the analysis to compare."}</p>
      <p className="text-xs text-slate-500">MAO = ARV × buyer percentage − repairs − assignment fee. Rounded to cents. These are estimates for your review.</p>
      <ActionForm key={"analysis-" + property.updatedAt} action={saveAnalysis}>
        <PropertyVersion property={property}/>
        <div className="grid gap-4 sm:grid-cols-2">
          <Amount name="askingPrice" label="Asking price ($)" value={property.askingPrice}/>
          <Amount name="arv" label="ARV — After Repair Value ($)" value={property.arv}/>
          <Amount name="repairEstimate" label="Estimated repairs ($)" value={property.repairEstimate}/>
          <Amount name="assignmentFee" label="Desired assignment fee ($)" value={property.assignmentFee}/>
          <Amount name="buyerPercentage" label="Buyer percentage (%)" value={property.buyerPercentage} percentage/>
        </div><p className="text-sm text-slate-500">Enter percentages as 70 for 70%. Blank fields remain unknown.</p><SubmitButton>Save analysis</SubmitButton>
      </ActionForm>
    </Section></div>
    <Section title="Deal Readiness"><ul className="grid gap-2 sm:grid-cols-2">{dealReadiness(property).map(item => <li key={item.key}><span aria-hidden="true">{item.ready ? "✓" : "!"}</span> {item.label}</li>)}</ul>
      <ActionForm key={"motivation-" + property.updatedAt} action={saveMotivation}><PropertyVersion property={property}/><Field name="sellerMotivation" label="Seller motivation" value={property.sellerMotivation} type="textarea"/><SubmitButton>Save motivation</SubmitButton></ActionForm>
    </Section>
    <div id="follow-up" className="scroll-mt-6"><Section title="Follow-Up">
      <p className="font-medium">{followUpStatus(property.nextActionDate, today)}{property.nextActionDate ? " · " + displayDate(property.nextActionDate) : ""}</p>
      <p className="text-sm text-slate-500">Today: {displayDate(today)} · Central Time (America/Chicago). Selected dates stay on the same calendar day.</p>
      <ActionForm key={"follow-up-" + property.updatedAt} action={saveFollowUp}><PropertyVersion property={property}/>
        <Field name="nextAction" label="Next action" value={property.nextAction}/>
        <Field name="nextActionDate" label="Follow-up date" value={calendarDate(property.nextActionDate)} type="date"/>
        <p className="text-sm text-slate-500">Clear the date to remove the schedule. General tasks remain on the Tasks page.</p><SubmitButton>Save follow-up</SubmitButton>
      </ActionForm>
    </Section></div>
    <div id="change-stage" className="scroll-mt-6"><Section title="Change Stage"><ActionForm key={"stage-" + property.updatedAt} action={changePropertyStage}>
      <PropertyVersion property={property}/><label className="block"><span className="mb-2 block text-sm font-medium">Pipeline stage</span><select name="status" defaultValue={property.status} className={inputClass}>{allStages.map(status => <option key={status} value={status}>{stageLabels[status]}</option>)}</select></label><SubmitButton>Save stage</SubmitButton>
    </ActionForm></Section></div>
    <div id="add-note" className="scroll-mt-6"><Section title="Add Note"><ActionForm key={"note-" + property.updatedAt} action={addPropertyNote}><PropertyVersion property={property}/><Field name="note" label="New note (appended to existing notes)" type="textarea"/><SubmitButton>Add note</SubmitButton></ActionForm></Section></div>
  </>;
}
