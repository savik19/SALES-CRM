// ---------------------------------------------------------------------------
// Presentation-only styling for Lead Status and Priority badges.
// Values (and their order) live with the data in src/data/mockLeads.js; this
// file only decides how each one LOOKS. Keyed by the exact label string.
// ---------------------------------------------------------------------------

// Lead Status → Tailwind badge classes.
// Colour language: neutral for early pipeline, brand blue as momentum builds,
// green for the won/post-sale group, red for Lost, amber for On Hold, and a
// dark pill for Cancelled (a won deal that fell apart — distinct from Lost).
export const STATUS_BADGE = {
  // "Open" is the entry stage for a Deal (Lead → Deal model).
  Open: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  New: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  Attempted: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  Contacted: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  "Details Shared": "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  Interested: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  Qualified: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  "Meeting Scheduled":
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  "Meeting Done": "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  "Proposal Sent": "bg-brand text-white",
  Negotiation: "bg-brand text-white",
  Won: "bg-green-100 text-green-700 ring-1 ring-inset ring-green-200",
  "Project Started":
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  "Project Delivered":
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  Closed: "bg-green-600 text-white",
  Lost: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  "On Hold": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  Cancelled: "bg-slate-800 text-white",
};

// Priority → Tailwind badge classes (Low → Urgent).
export const PRIORITY_BADGE = {
  Low: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  Medium: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  High: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  Urgent: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200",
};

const FALLBACK = "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";

export function statusBadgeClass(label) {
  return STATUS_BADGE[label] || FALLBACK;
}

export function priorityBadgeClass(label) {
  return PRIORITY_BADGE[label] || FALLBACK;
}
