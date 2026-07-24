// ===========================================================================
//  STATUS TAXONOMY  —  the SINGLE SOURCE OF TRUTH for every status value
// ===========================================================================
//  Lead status, deal stage and deal approval all live here. Keys are snake_case
//  wire values (what the API stores / accepts); labels are the human strings the
//  UI renders. Nothing else in the app may hard-code a status string — import
//  from this module so a rename happens in exactly one place.
//
//  Model (see docs/BUILD_BRIEF.md for the rationale):
//    - A LEAD has ONE status. 7 are manual (1–7); 2 are DERIVED from its deals
//      (in_discussion, won) and never user-selectable; 1 (lost) is manual+gated.
//    - A DEAL has TWO independent fields: `stage` (6 values, the pipeline) and
//      `approval` (5 values, the money control). One is not derived from the
//      other beyond the explicit approval transitions.
//
//  TODO(backend): mirror these enums server-side. Lead statuses `in_discussion`
//  and `won` are SERVER-DERIVED — the API must never accept them on write.
// ===========================================================================

// ---- Lead status (10) ------------------------------------------------------
export const LEAD_STATUS = {
  NEW: "new",
  ATTEMPTED: "attempted",
  CONTACTED: "contacted",
  DETAILS_SHARED: "details_shared",
  INTERESTED: "interested",
  MEETING_SCHEDULED: "meeting_scheduled",
  MEETING_DONE: "meeting_done",
  IN_DISCUSSION: "in_discussion", // derived
  WON: "won", // derived (one-way door)
  LOST: "lost", // manual, gated
};

// Full display order (funnel order).
export const LEAD_STATUS_ORDER = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.ATTEMPTED,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.DETAILS_SHARED,
  LEAD_STATUS.INTERESTED,
  LEAD_STATUS.MEETING_SCHEDULED,
  LEAD_STATUS.MEETING_DONE,
  LEAD_STATUS.IN_DISCUSSION,
  LEAD_STATUS.WON,
  LEAD_STATUS.LOST,
];

// The 7 manual pre-deal statuses (user-selectable, statuses 1–7).
export const MANUAL_LEAD_STATUSES = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.ATTEMPTED,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.DETAILS_SHARED,
  LEAD_STATUS.INTERESTED,
  LEAD_STATUS.MEETING_SCHEDULED,
  LEAD_STATUS.MEETING_DONE,
];

// Computed, never user-set (rendered as read-only "auto" badges).
export const DERIVED_LEAD_STATUSES = [
  LEAD_STATUS.IN_DISCUSSION,
  LEAD_STATUS.WON,
];

export function isDerivedLeadStatus(status) {
  return DERIVED_LEAD_STATUSES.includes(status);
}

// ---- Deal stage (6) --------------------------------------------------------
export const DEAL_STAGE = {
  OPEN: "open",
  PROPOSAL_SENT: "proposal_sent",
  NEGOTIATION: "negotiation",
  PROJECT_STARTED: "project_started", // system, on approval only
  PROJECT_DELIVERED: "project_delivered", // Admin only
  CANCELLED: "cancelled",
};

export const DEAL_STAGE_ORDER = [
  DEAL_STAGE.OPEN,
  DEAL_STAGE.PROPOSAL_SENT,
  DEAL_STAGE.NEGOTIATION,
  DEAL_STAGE.PROJECT_STARTED,
  DEAL_STAGE.PROJECT_DELIVERED,
  DEAL_STAGE.CANCELLED,
];

// The 4 stages a user can drag a deal between on the Kanban board. Project
// Started / Project Delivered are OUTCOMES of approval, not drag targets.
export const KANBAN_STAGES = [
  DEAL_STAGE.OPEN,
  DEAL_STAGE.PROPOSAL_SENT,
  DEAL_STAGE.NEGOTIATION,
  DEAL_STAGE.CANCELLED,
];

// Read-only trailing columns on the board (set by the approval flow / Admin).
export const OUTCOME_STAGES = [
  DEAL_STAGE.PROJECT_STARTED,
  DEAL_STAGE.PROJECT_DELIVERED,
];

// "Live" = an active, pre-approval deal in the sales pipeline.
export const LIVE_STAGES = new Set([
  DEAL_STAGE.OPEN,
  DEAL_STAGE.PROPOSAL_SENT,
  DEAL_STAGE.NEGOTIATION,
]);

export function isLiveStage(stage) {
  return LIVE_STAGES.has(stage);
}

// ---- Deal approval (5) -----------------------------------------------------
export const DEAL_APPROVAL = {
  NOT_REQUESTED: "not_requested", // default on create
  PENDING: "pending", // submitted, awaiting Admin
  APPROVED: "approved", // Admin approved; stage → project_started
  REJECTED: "rejected", // Admin declined; returns to editable
  REVERSED: "reversed", // Admin cancelled a previously approved deal
};

export const DEAL_APPROVAL_ORDER = [
  DEAL_APPROVAL.NOT_REQUESTED,
  DEAL_APPROVAL.PENDING,
  DEAL_APPROVAL.APPROVED,
  DEAL_APPROVAL.REJECTED,
  DEAL_APPROVAL.REVERSED,
];

// An approved deal is CREDITED — it counts toward target and carries commission
// (accrued at approval, released at delivery). Reversed deals are clawed back.
export function isCreditedApproval(approval) {
  return approval === DEAL_APPROVAL.APPROVED;
}

// ---- Labels ----------------------------------------------------------------
// Every status key → its human label. Keyed by the snake_case wire value so a
// single `labelOf()` works across leads, stages and approvals.
export const LABEL = {
  // lead status
  [LEAD_STATUS.NEW]: "New",
  [LEAD_STATUS.ATTEMPTED]: "Attempted",
  [LEAD_STATUS.CONTACTED]: "Contacted",
  [LEAD_STATUS.DETAILS_SHARED]: "Details Shared",
  [LEAD_STATUS.INTERESTED]: "Interested",
  [LEAD_STATUS.MEETING_SCHEDULED]: "Meeting Scheduled",
  [LEAD_STATUS.MEETING_DONE]: "Meeting Done",
  [LEAD_STATUS.IN_DISCUSSION]: "In Discussion",
  [LEAD_STATUS.WON]: "Won",
  [LEAD_STATUS.LOST]: "Lost",
  // deal stage
  [DEAL_STAGE.OPEN]: "Open",
  [DEAL_STAGE.PROPOSAL_SENT]: "Proposal Sent",
  [DEAL_STAGE.NEGOTIATION]: "Negotiation",
  [DEAL_STAGE.PROJECT_STARTED]: "Project Started",
  [DEAL_STAGE.PROJECT_DELIVERED]: "Project Delivered",
  [DEAL_STAGE.CANCELLED]: "Cancelled",
  // deal approval
  [DEAL_APPROVAL.NOT_REQUESTED]: "Not Requested",
  [DEAL_APPROVAL.PENDING]: "Pending Approval",
  [DEAL_APPROVAL.APPROVED]: "Approved",
  [DEAL_APPROVAL.REJECTED]: "Rejected",
  [DEAL_APPROVAL.REVERSED]: "Reversed",
};

// Resolve any status key to its label (falls back to the raw value).
export function labelOf(key) {
  return LABEL[key] || key || "";
}

// {value,label} option lists for <select>/filter menus.
export const LEAD_STATUS_OPTIONS = LEAD_STATUS_ORDER.map((v) => ({
  value: v,
  label: LABEL[v],
}));
export const MANUAL_LEAD_STATUS_OPTIONS = MANUAL_LEAD_STATUSES.map((v) => ({
  value: v,
  label: LABEL[v],
}));
export const DEAL_STAGE_OPTIONS = DEAL_STAGE_ORDER.map((v) => ({
  value: v,
  label: LABEL[v],
}));
export const DEAL_APPROVAL_OPTIONS = DEAL_APPROVAL_ORDER.map((v) => ({
  value: v,
  label: LABEL[v],
}));
