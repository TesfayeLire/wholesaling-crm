import Link from "next/link";
import { createContractFromOffer, createOffer, updateAcquisitionContract, updateOffer } from "@/app/acquisition-actions";
import { acquisitionSummary, contractStatuses, emdStatuses, offerStatuses, statusOptions, terminalContract, terminalOffer } from "@/src/acquisitions";
import type { Offer, AcquisitionContract } from "@/src/acquisition-data";
import { formatMoney } from "@/src/deal-analysis";
import { displayDate } from "@/src/follow-up";
import { ActionForm, SubmitButton } from "./action-form";
import { Field, inputClass, Section } from "./record-ui";
import { DeadlineList } from "./acquisition-summary";

type Seller = { id: number; firstName: string; lastName: string | null };
function Select({ name, label, values, value }: { name: string; label: string; values: Record<string, string>; value: string }) {
  return <label className="block text-sm font-medium">{label}<select className={inputClass} name={name} defaultValue={value}>{Object.entries(values).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
}
function SellerSelect({ contacts, value }: { contacts: Seller[]; value?: number | null }) {
  return <label className="block text-sm font-medium">Seller (optional linked contact)<select className={inputClass} name="contactId" defaultValue={value ?? ""}><option value="">No seller selected</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></label>;
}
function Identity({ id, propertyId, updatedAt }: { id?: number; propertyId: number; updatedAt: string }) {
  return <><input type="hidden" name="propertyId" value={propertyId}/><input type="hidden" name="updatedAt" value={updatedAt}/>{id !== undefined && <input type="hidden" name="id" value={id}/>}</>;
}
function PipelineChoice({ label }: { label: string }) { return <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="advancePipeline" value="yes"/>{label}</label>; }
export function AcquisitionPanel({ property, contacts, offers, contracts }: { property: { id: number; updatedAt: string }; contacts: Seller[]; offers: Offer[]; contracts: AcquisitionContract[] }) {
  const summary = acquisitionSummary(offers, contracts);
  return <div id="acquisitions" className="space-y-6">
    <Section title="Acquisition deadlines"><DeadlineList deadlines={summary.deadlines}/><p className="text-xs text-slate-500">Active contract deadlines and Pending/Countered offer expirations. Paid/Waived EMD is excluded. Dates use Central Time.</p></Section>
    <div id="offers"><Section title="Offers & negotiation history">
      <p className="text-sm text-slate-600">Actual offers are separate from calculated MAO and the legacy property offer field. Record each new offer separately; counter changes remain in Activity history.</p>
      <details className="rounded-lg border border-slate-200 p-4"><summary className="cursor-pointer font-semibold">Record a new offer</summary><ActionForm action={createOffer} key={property.updatedAt} className="mt-4 space-y-4">
        <Identity propertyId={property.id} updatedAt={property.updatedAt}/><SellerSelect contacts={contacts}/>
        <div className="grid gap-4 sm:grid-cols-2"><Field name="amount" label="Original offer amount ($)" required/><Field name="offerDate" label="Offer date (required for Pending)" type="date"/><Field name="expirationDate" label="Expiration (optional)" type="date"/><Select name="status" label="Status" values={{ DRAFT: "Draft", PENDING: "Pending" }} value="DRAFT"/></div>
        <Field name="notes" label="Offer notes (optional)" type="textarea"/><PipelineChoice label="Also move pipeline to Offer Made (Pending only)"/><SubmitButton>Create offer</SubmitButton>
      </ActionForm></details>
      {!offers.length && <p className="text-sm text-slate-500">No offers recorded yet.</p>}
      {[...offers].sort((a, b) => b.id - a.id).map(offer => <article id={`offer-${offer.id}`} key={offer.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold">Offer #{offer.id} · {formatMoney(offer.amount)} original · {offerStatuses[offer.status]}</h3>
        <p className="text-sm text-slate-600">Offer date: {offer.offerDate ? displayDate(offer.offerDate) : "Not entered"} · Expiration: {offer.expirationDate ? displayDate(offer.expirationDate) : "Not entered"}</p>
        {offer.contactId && <Link className="text-sm underline" href={`/contacts/${offer.contactId}`}>Seller: {contacts.find(c => c.id === offer.contactId)?.firstName ?? `Contact #${offer.contactId}`}</Link>}
        {offer.counterAmount && <p>Seller counter: {formatMoney(offer.counterAmount)}</p>}{offer.acceptedAmount && <p className="font-semibold">Accepted price: {formatMoney(offer.acceptedAmount)}</p>}
        {offer.notes && <p className="whitespace-pre-wrap break-words text-sm">{offer.notes}</p>}
        {!terminalOffer(offer.status) && <details><summary className="cursor-pointer text-sm font-semibold">Update status / record counter</summary><ActionForm action={updateOffer} key={offer.updatedAt} className="mt-4 space-y-4"><Identity id={offer.id} propertyId={property.id} updatedAt={offer.updatedAt}/>
          <div className="grid gap-4 sm:grid-cols-2"><Select name="status" label="Status" values={statusOptions("offer", offer.status)} value={offer.status}/><Field name="counterAmount" label="Seller counter amount ($, optional)" value={offer.counterAmount}/><Field name="acceptedAmount" label="Accepted amount ($, required when accepting)" value={offer.acceptedAmount}/><Field name="offerDate" label="Offer date" type="date" value={offer.offerDate?.slice(0, 10)}/><Field name="expirationDate" label="Expiration" type="date" value={offer.expirationDate?.slice(0, 10)}/></div>
          <p className="text-xs text-slate-500">For acceptance, explicitly enter the original offer or current counter. Record a new offer for a different price. Finalized offers cannot be edited.</p><Field name="notes" label="Notes / negotiation context" type="textarea" value={offer.notes}/><PipelineChoice label="Also update pipeline: Countered → Negotiating; Pending/Accepted → Offer Made"/><SubmitButton>Save offer update</SubmitButton>
        </ActionForm></details>}
        {offer.status === "ACCEPTED" && !contracts.some(c => c.offerId === offer.id) && <ActionForm action={createContractFromOffer}><Identity propertyId={property.id} updatedAt={offer.updatedAt}/><input type="hidden" name="offerId" value={offer.id}/><SubmitButton>Create contract from accepted offer</SubmitButton><p className="text-xs text-slate-500">Creates one Draft contract at the accepted price. Dates and EMD remain blank.</p></ActionForm>}
        {contracts.filter(c => c.offerId === offer.id).map(c => <a className="block text-sm underline" key={c.id} href={`#contract-${c.id}`}>View acquisition contract #{c.id}</a>)}
      </article>)}
    </Section></div>
    <Section title="Acquisition contracts">
      {!contracts.length && <p className="text-sm text-slate-500">Accept an offer, then choose Create contract from accepted offer.</p>}
      {contracts.map(contract => <article id={`contract-${contract.id}`} key={contract.id} className="space-y-3 rounded-lg border border-slate-200 p-4"><h3 className="font-semibold">Contract #{contract.id} · {formatMoney(contract.purchasePrice)} · {contractStatuses[contract.status]}</h3><a className="text-sm underline" href={`#offer-${contract.offerId}`}>Source accepted offer #{contract.offerId}</a>
        {contract.contactId && <Link className="block text-sm underline" href={`/contacts/${contract.contactId}`}>Seller: {contacts.find(c => c.id === contract.contactId)?.firstName ?? `Contact #${contract.contactId}`}</Link>}
        <dl className="grid gap-2 text-sm sm:grid-cols-2">{[["Contract date", contract.contractDate], ["Inspection deadline", contract.inspectionDeadline], ["Closing deadline", contract.closingDeadline], ["EMD due", contract.earnestMoneyDueDate]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd>{value ? displayDate(value) : "Not entered"}</dd></div>)}</dl>
        <p className="text-sm">EMD: {formatMoney(contract.earnestMoneyAmount)} · {emdStatuses[contract.earnestMoneyStatus]}</p>{contract.notes && <p className="whitespace-pre-wrap break-words text-sm">{contract.notes}</p>}
        {!terminalContract(contract.status) && <details open={contract.status === "DRAFT"}><summary className="cursor-pointer font-semibold">Edit contract / deadlines / EMD</summary><ActionForm action={updateAcquisitionContract} key={contract.updatedAt} className="mt-4 space-y-4"><Identity id={contract.id} propertyId={property.id} updatedAt={contract.updatedAt}/><SellerSelect contacts={contacts} value={contract.contactId}/>
          <div className="grid gap-4 sm:grid-cols-2"><Field name="purchasePrice" label="Purchase price ($)" required value={contract.purchasePrice}/><Select name="status" label="Acquisition status" values={statusOptions("contract", contract.status)} value={contract.status}/><Field name="contractDate" label="Contract date" type="date" value={contract.contractDate?.slice(0, 10)}/><Field name="inspectionDeadline" label="Inspection / due-diligence deadline" type="date" value={contract.inspectionDeadline?.slice(0, 10)}/><Field name="closingDeadline" label="Closing deadline" type="date" value={contract.closingDeadline?.slice(0, 10)}/></div>
          <fieldset className="rounded-lg border border-slate-200 p-3"><legend className="text-sm font-semibold">Earnest money</legend><div className="grid gap-4 sm:grid-cols-2"><Field name="earnestMoneyAmount" label="EMD amount ($)" value={contract.earnestMoneyAmount}/><Field name="earnestMoneyDueDate" label="EMD due date" type="date" value={contract.earnestMoneyDueDate?.slice(0, 10)}/><Select name="earnestMoneyStatus" label="EMD status" values={emdStatuses} value={contract.earnestMoneyStatus}/></div></fieldset>
          <Field name="notes" label="Contract notes" type="textarea" value={contract.notes}/><p className="text-xs text-slate-500">Active requires contract and closing dates. Acquisition stage completed does not mark the property Closed or record a final closing. Completed/Cancelled records are retained and locked.</p><PipelineChoice label="Also move pipeline to Under Contract (Active only)"/><SubmitButton>Save acquisition contract</SubmitButton>
        </ActionForm></details>}
      </article>)}
    </Section>
  </div>;
}
