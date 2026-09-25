import { calculateAnalysis, type Analysis } from "./deal-analysis";
import { followUpStatus, isActive, todayDate } from "./follow-up";
type ReadinessProperty = Analysis & { sellerMotivation: string | null; nextAction: string | null; nextActionDate: string | null; status: string };
export function dealReadiness(p: ReadinessProperty) {
  return [
    { key: "asking", ready: p.askingPrice !== null, label: p.askingPrice !== null ? "Asking price entered" : "Asking price needed" },
    { key: "arv", ready: p.arv !== null, label: p.arv !== null ? "ARV entered" : "ARV needed" },
    { key: "repairs", ready: p.repairEstimate !== null, label: p.repairEstimate !== null ? "Repair estimate entered" : "Repair estimate needed" },
    { key: "fee", ready: p.assignmentFee !== null, label: p.assignmentFee !== null ? "Assignment fee entered" : "Assignment fee needed" },
    { key: "percentage", ready: p.buyerPercentage !== null, label: p.buyerPercentage !== null ? "Buyer percentage entered" : "Buyer percentage needed" },
    { key: "motivation", ready: !!p.sellerMotivation?.trim(), label: p.sellerMotivation?.trim() ? "Seller motivation recorded" : "Seller motivation unknown" },
    { key: "followUp", ready: !!p.nextActionDate && !!p.nextAction?.trim(), label: p.nextActionDate && p.nextAction?.trim() ? "Follow-up scheduled" : "Follow-up action and date needed" },
  ];
}
export function recommendedAction(p: ReadinessProperty, today = todayDate()) {
  if (!isActive(p.status)) return "No active follow-up required for this stage.";
  const due = followUpStatus(p.nextActionDate, today);
  if ((due === "Overdue" || due === "Due today") && p.nextAction?.trim()) return p.nextAction;
  if (p.askingPrice === null) return "Contact seller/agent to confirm the asking price.";
  if (p.arv === null) return "Research comparable sales.";
  if (p.repairEstimate === null) return "Estimate repairs.";
  if (!p.sellerMotivation?.trim()) return "Contact seller/agent to clarify motivation.";
  if (p.assignmentFee === null || p.buyerPercentage === null || !calculateAnalysis(p)) return "Complete the deal-analysis inputs.";
  if (!p.nextActionDate || !p.nextAction?.trim()) return "Schedule follow-up.";
  return "Review deal analysis.";
}
