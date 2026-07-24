// ---------------------------------------------------------------------------
// Presentation-only styling for Lead Status, Deal Stage, Deal Approval and
// Priority badges. Status VALUES live in the single source of truth
// (src/lib/statuses.js); this file only decides how each one LOOKS. Keyed by the
// snake_case status key.
//
// Colour language: neutral for early pipeline, brand blue as momentum builds,
// green for won, red for lost, amber for pending. DERIVED lead statuses
// (in_discussion, won) render as OUTLINE badges so it's obvious they aren't
// user-set.
// ---------------------------------------------------------------------------

import { LEAD_STATUS, DEAL_STAGE, DEAL_APPROVAL } from "@/lib/statuses";

// Lead status → Tailwind badge classes.
export const STATUS_BADGE = {
  [LEAD_STATUS.NEW]: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  [LEAD_STATUS.ATTEMPTED]:
    "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  [LEAD_STATUS.CONTACTED]: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  [LEAD_STATUS.DETAILS_SHARED]:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  [LEAD_STATUS.INTERESTED]:
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  [LEAD_STATUS.MEETING_SCHEDULED]:
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  [LEAD_STATUS.MEETING_DONE]:
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  // Derived → OUTLINE treatment (no fill).
  [LEAD_STATUS.IN_DISCUSSION]:
    "bg-white text-brand-700 ring-1 ring-inset ring-brand-300",
  [LEAD_STATUS.WON]:
    "bg-white text-green-700 ring-1 ring-inset ring-green-300",
  [LEAD_STATUS.LOST]: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

// Deal stage → Tailwind badge classes.
export const STAGE_BADGE = {
  [DEAL_STAGE.OPEN]: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  [DEAL_STAGE.PROPOSAL_SENT]: "bg-brand text-white",
  [DEAL_STAGE.NEGOTIATION]: "bg-brand text-white",
  [DEAL_STAGE.PROJECT_STARTED]:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  [DEAL_STAGE.PROJECT_DELIVERED]:
    "bg-green-600 text-white",
  [DEAL_STAGE.CANCELLED]: "bg-slate-800 text-white",
};

// Deal approval → Tailwind badge classes.
export const APPROVAL_BADGE = {
  [DEAL_APPROVAL.NOT_REQUESTED]:
    "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200",
  [DEAL_APPROVAL.PENDING]:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  [DEAL_APPROVAL.APPROVED]:
    "bg-green-100 text-green-700 ring-1 ring-inset ring-green-200",
  [DEAL_APPROVAL.REJECTED]: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  [DEAL_APPROVAL.REVERSED]: "bg-slate-800 text-white",
};

// Priority → Tailwind badge classes (Low → Urgent).
export const PRIORITY_BADGE = {
  Low: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  Medium: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  High: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  Urgent: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200",
};

const FALLBACK = "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";

export function statusBadgeClass(key) {
  return STATUS_BADGE[key] || FALLBACK;
}
export function stageBadgeClass(key) {
  return STAGE_BADGE[key] || FALLBACK;
}
export function approvalBadgeClass(key) {
  return APPROVAL_BADGE[key] || FALLBACK;
}
export function priorityBadgeClass(label) {
  return PRIORITY_BADGE[label] || FALLBACK;
}
