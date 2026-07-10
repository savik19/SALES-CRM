// ---------------------------------------------------------------------------
// Lead status pipeline (single source of truth for statuses)
// ---------------------------------------------------------------------------
// Normalised pipeline from the Build Brief §6. The source sheet had messy,
// inconsistent statuses; everything maps into the clean list below.
//
// Pipeline order matters — it drives sorting, the (future) Kanban board, and
// the order of the status filter dropdown. Adjust ONLY with Prakhar's sign-off.
// ---------------------------------------------------------------------------

// Each status has:
//   key    – stable machine value stored on a lead (what the API will send)
//   label  – human label shown in the UI
//   type   – "pipeline" (part of the funnel) or "special" (non-pipeline state)
//   badge  – Tailwind classes for the colour-coded badge
//
// Brand blue (#1060E0) is reserved for the primary "active" stages so the eye
// is drawn to leads that are actually moving.
export const LEAD_STATUSES = [
  {
    key: "new",
    label: "New",
    type: "pipeline",
    badge: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  },
  {
    key: "first_call_pending",
    label: "First Call Pending",
    type: "pipeline",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  },
  {
    key: "in_progress",
    label: "In Progress",
    type: "pipeline",
    badge: "bg-brand text-white",
  },
  {
    key: "follow_up",
    label: "Follow-up",
    type: "pipeline",
    badge: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
  },
  {
    key: "demo_proposal",
    label: "Demo / Proposal",
    type: "pipeline",
    badge: "bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200",
  },
  {
    key: "on_hold",
    label: "On Hold",
    type: "pipeline",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  },
  {
    key: "won",
    label: "Won",
    type: "pipeline",
    badge: "bg-green-100 text-green-700 ring-1 ring-inset ring-green-200",
  },
  {
    key: "dropped",
    label: "Dropped",
    type: "pipeline",
    badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  },
  {
    // Non-pipeline state: unable to reach the prospect at all.
    key: "not_connecting",
    label: "Not Connecting",
    type: "special",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  },
];

// Quick lookup by key -> status object.
export const STATUS_BY_KEY = LEAD_STATUSES.reduce((acc, s) => {
  acc[s.key] = s;
  return acc;
}, {});

// Convenience: ordered list of status keys (pipeline order).
export const STATUS_ORDER = LEAD_STATUSES.map((s) => s.key);

// Map a raw sheet status string -> normalised status key.
// The Laravel team can reuse this when importing the legacy master sheet.
// Raw values seen in the sheet (Brief §6): New, First Call Pending, In Progress,
// On Hold, Follow Back, Call not Connecting, Dropped, Open.
export const RAW_STATUS_MAP = {
  New: "new",
  Open: "new",
  "First Call Pending": "first_call_pending",
  "In Progress": "in_progress",
  "Follow Back": "follow_up",
  "Follow-up": "follow_up",
  "Demo / Proposal": "demo_proposal",
  "On Hold": "on_hold",
  Won: "won",
  Dropped: "dropped",
  "Call not Connecting": "not_connecting",
};

// Normalise any raw status string to a known key (defaults to "new").
export function normaliseStatus(raw) {
  if (!raw) return "new";
  return RAW_STATUS_MAP[raw.trim()] || "new";
}
