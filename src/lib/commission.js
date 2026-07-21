// ---------------------------------------------------------------------------
// Commission math — pure, no React, no storage. The compensation catalog
// (config.services / config.products, see lib/compConfig) is the single source
// of truth for what each offering pays each role. A won Deal carries line items
// (offeringId + amount); this module turns those into each person's commission
// and tracks the quarterly hold before a commission is finalized/payable.
//
// Deal shape this module reads (established by the Company → Deal model, PR 2):
//   deal.lineItems      : [{ offeringId, amount }]
//   deal.leadStatus     : the pipeline stage (Won / Project Started / Cancelled…)
//   deal.wonApprovedDate : ISO date the Admin approved the win (or "")
//   deal.cancelled       : optional boolean (refund/cancellation)
// The functions are defensive: a missing offering, empty line items, or an
// unapproved deal all resolve to 0 / "none" rather than throwing.
// ---------------------------------------------------------------------------

import { monthsSince } from "@/lib/format";
import { isDead } from "@/lib/analytics";

// The quarterly hold: a commission is only finalized (payable) once this many
// months have passed since the win was approved, giving a buffer to reverse it
// if the deal cancels/refunds. Config-worthy later; a constant for now.
export const HOLD_MONTHS = 3;

// Resolve one commission rule against a sold amount.
//   { type: "fixed", value }   → the flat amount (amount is ignored)
//   { type: "percent", value } → value% of the sold amount
export function ruleAmount(rule, amount) {
  if (!rule) return 0;
  const v = Number(rule.value) || 0;
  if (rule.type === "percent") return ((Number(amount) || 0) * v) / 100;
  return v; // "fixed"
}

// Find an offering by id across both catalog lists (services + products).
export function findOffering(config, offeringId) {
  if (!config || !offeringId) return null;
  return (
    (config.services || []).find((o) => o.id === offeringId) ||
    (config.products || []).find((o) => o.id === offeringId) ||
    null
  );
}

// Commission a role ("dsc" | "bdm") earns on one line item.
export function lineItemCommission(item, config, role) {
  const offering = findOffering(config, item?.offeringId);
  if (!offering) return 0;
  const rule = role === "bdm" ? offering.bdm : offering.dsc;
  return ruleAmount(rule, item?.amount);
}

// Total commission a role earns on a Deal = Σ over its line items.
export function dealCommission(deal, config, role) {
  return (deal?.lineItems || []).reduce(
    (sum, item) => sum + lineItemCommission(item, config, role),
    0
  );
}

// The Closed (contract) value of a Deal = Σ of its line-item amounts. Deriving
// it from the line items (rather than a free-typed field) is what keeps the
// commission base honest — it can never diverge from what was actually sold.
export function dealClosedValue(deal) {
  return (deal?.lineItems || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
}

// True once a deal is a reversal (cancelled / lost / refunded) — its commission
// is clawed back to 0 regardless of the hold.
export function isReversedDeal(deal) {
  return !!deal && (deal.cancelled === true || isDead(deal.leadStatus));
}

// The lifecycle of a Deal's commission, given "now":
//   "none"      — not an approved win yet (no wonApprovedDate)
//   "reversed"  — cancelled / refunded → commission is 0
//   "pending"   — approved but still inside the HOLD_MONTHS window
//   "finalized" — hold has elapsed and the deal is still won → payable
export function commissionStatus(deal, now = new Date()) {
  if (!deal || !deal.wonApprovedDate) return "none";
  if (isReversedDeal(deal)) return "reversed";
  const elapsed = monthsSince(deal.wonApprovedDate, now) ?? 0;
  return elapsed >= HOLD_MONTHS ? "finalized" : "pending";
}

// The date a Deal's commission matures (finalizes), or null if not applicable.
export function commissionMaturesOn(deal) {
  if (!deal?.wonApprovedDate) return null;
  const d = new Date(deal.wonApprovedDate + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + HOLD_MONTHS);
  return d.toISOString().slice(0, 10);
}

// Roll up a person's commission across many deals into finalized (payable now)
// and pending (still in the hold window) buckets. Reversed deals contribute 0.
// `deals` are already scoped to the person + period by the caller.
export function commissionRollup(deals, config, role, now = new Date()) {
  let finalized = 0;
  let pending = 0;
  for (const deal of deals || []) {
    const status = commissionStatus(deal, now);
    if (status === "none" || status === "reversed") continue;
    const amount = dealCommission(deal, config, role);
    if (status === "finalized") finalized += amount;
    else pending += amount;
  }
  return { finalized, pending, total: finalized + pending };
}
