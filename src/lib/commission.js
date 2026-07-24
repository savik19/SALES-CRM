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
import { DEAL_STAGE, DEAL_APPROVAL } from "@/lib/statuses";

// A deal is "dead" (contributes no commission) once it is cancelled or reversed.
function isDeadDeal(deal) {
  return (
    deal?.stage === DEAL_STAGE.CANCELLED ||
    deal?.approval === DEAL_APPROVAL.REVERSED
  );
}

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

// Commission a role earns on a single-offering Deal (Lead → Deal model): one
// offering priced on the deal's FINAL amount (never the quote). This is the
// per-deal commission used everywhere the unit of sale is one deal = one offering.
export function singleDealCommission(deal, config, role) {
  const offering = findOffering(config, deal?.offeringId);
  if (!offering) return 0;
  const rule = role === "bdm" ? offering.bdm : offering.dsc;
  const amount = deal?.finalAmount ?? deal?.quotedAmount ?? 0;
  return ruleAmount(rule, amount);
}

// Split a deal's commission into held (accrued, not yet payable) vs payable,
// under the config's release trigger. PURE — the Earned(held)/Payable model:
//   approval !== approved            → { held: 0, payable: 0 }
//   trigger 'project_started'        → payable at approval
//   trigger 'project_delivered'      → payable once stage is project_delivered,
//                                      otherwise held
//   reversed / cancelled             → { held: 0, payable: 0 } (clawed back)
export function dealCommissionSplit(deal, config, role) {
  if (!deal || isDeadDeal(deal)) return { held: 0, payable: 0 };
  if (deal.approval !== DEAL_APPROVAL.APPROVED) return { held: 0, payable: 0 };
  const amount = singleDealCommission(deal, config, role);
  const trigger = config?.commissionReleaseTrigger || "project_delivered";
  const released =
    trigger === "project_started" ||
    deal.stage === DEAL_STAGE.PROJECT_DELIVERED;
  return released ? { held: 0, payable: amount } : { held: amount, payable: 0 };
}

// Roll a set of deals into held / payable totals for `role`.
export function commissionSplitForDeals(deals, config, role) {
  let held = 0;
  let payable = 0;
  for (const d of deals || []) {
    const s = dealCommissionSplit(d, config, role);
    held += s.held;
    payable += s.payable;
  }
  return { held, payable, total: held + payable };
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

// True once a deal is a reversal (cancelled / reversed) — its commission is
// clawed back to 0 regardless of the hold.
export function isReversedDeal(deal) {
  return isDeadDeal(deal);
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
