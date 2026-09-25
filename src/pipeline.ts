import type { PipelineStatus } from "./crm-input";
export const stageLabels: Record<PipelineStatus, string> = {
  NEW_LEAD: "New Lead", RESEARCHING: "Researching", CONTACTED: "Contacted",
  NURTURE: "Follow-Up", OFFER_MADE: "Offer Made", UNDER_CONTRACT: "Under Contract",
  DISPOSITION: "Marketing to Buyers", CLOSED: "Assigned / Closed", DEAD: "Dead / Not a Deal",
  QUALIFIED: "Qualified (existing stage)", NEGOTIATING: "Negotiating (existing stage)",
};
export const workflowStages: PipelineStatus[] = ["NEW_LEAD", "RESEARCHING", "CONTACTED", "NURTURE", "OFFER_MADE", "UNDER_CONTRACT", "DISPOSITION", "CLOSED"];
export const legacyStages: PipelineStatus[] = ["QUALIFIED", "NEGOTIATING"];
export const allStages = [...workflowStages, ...legacyStages, "DEAD" as const];
