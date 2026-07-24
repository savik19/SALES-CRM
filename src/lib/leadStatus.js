// ---------------------------------------------------------------------------
// Lead status derivation + validation — PURE (no React, no I/O, no storage).
//
// A lead has ONE status, but a lead can hold MANY deals, so any status that
// describes transaction progress cannot be stored on the lead — it is DERIVED
// from the lead's deals. Statuses 1–7 are manual; `in_discussion` and `won` are
// computed here and are never user-selectable; `lost` is manual but gated.
//
// The Laravel team mirrors this server-side (see docs/API_CONTRACT.md): the API
// must never accept `in_discussion` or `won` on write, and must re-validate the
// `lost` gate rather than trusting the client.
// ---------------------------------------------------------------------------

import {
  LEAD_STATUS,
  DEAL_APPROVAL,
  MANUAL_LEAD_STATUSES,
  isLiveStage,
} from "@/lib/statuses";

// The deals belonging to one lead.
function ownDeals(lead, deals) {
  const id = lead?.leadId;
  return (deals || []).filter((d) => d.leadId === id);
}

// Does this lead have any APPROVED deal (started or delivered)? An approved deal
// makes the lead a customer, forever — the one-way door to `won`.
export function hasApprovedDeal(lead, deals) {
  return ownDeals(lead, deals).some(
    (d) => d.approval === DEAL_APPROVAL.APPROVED
  );
}

/**
 * Derive a lead's status from its deals. Pure — no side effects. Priority order
 * matters; evaluate top-down and return on the first match.
 * @param {import('@/lib/types').Lead} lead
 * @param {import('@/lib/types').Deal[]} deals  ALL deals (filtered here by leadId)
 * @returns {string} one of LEAD_STATUS values
 */
export function deriveLeadStatus(lead, deals) {
  const own = ownDeals(lead, deals);
  const approved = own.filter((d) => d.approval === DEAL_APPROVAL.APPROVED);
  const live = own.filter((d) => isLiveStage(d.stage));

  // `won` is a ONE-WAY DOOR. Once a lead has had any approved deal it is a
  // customer forever; it never regresses, even if later deals are cancelled.
  if (approved.length > 0) return LEAD_STATUS.WON;
  if (lead?.leadStatus === LEAD_STATUS.WON) return LEAD_STATUS.WON;

  // A live (open / proposal / negotiation) deal reopens a Lost lead.
  if (live.length > 0) return LEAD_STATUS.IN_DISCUSSION;

  if (lead?.leadStatus === LEAD_STATUS.LOST) return LEAD_STATUS.LOST;

  // Manual pre-deal status stands. If somehow a derived value was persisted
  // (it never should be), fall back to New so no derived value leaks through.
  const s = lead?.leadStatus;
  return MANUAL_LEAD_STATUSES.includes(s) ? s : LEAD_STATUS.NEW;
}

// ---- Validation ------------------------------------------------------------

// `lost` is settable ONLY when the lead has zero approved deals. Enforced in the
// UI (disabled option + tooltip) AND re-validated in the data layer.
export function canSetLost(lead, deals) {
  return !hasApprovedDeal(lead, deals);
}

// Once a lead is derived-`won`, its manual dropdown is disabled entirely.
export function isManualStatusLocked(lead, deals) {
  return deriveLeadStatus(lead, deals) === LEAD_STATUS.WON;
}

// The manual status options for a lead's dropdown: the 7 manual statuses, plus
// `lost` (disabled when the gate blocks it). Derived statuses never appear.
// Returns [{ value, label, disabled, reason }].
export function manualStatusOptions(lead, deals, labelOf) {
  const locked = isManualStatusLocked(lead, deals);
  const opts = MANUAL_LEAD_STATUSES.map((value) => ({
    value,
    label: labelOf(value),
    disabled: locked,
    reason: locked ? "This lead is Won (has an approved deal)." : "",
  }));
  const lostAllowed = canSetLost(lead, deals);
  opts.push({
    value: LEAD_STATUS.LOST,
    label: labelOf(LEAD_STATUS.LOST),
    disabled: locked || !lostAllowed,
    reason: locked
      ? "This lead is Won (has an approved deal)."
      : !lostAllowed
        ? "Can't mark Lost while an approved deal exists."
        : "",
  });
  return opts;
}

// Data-layer guard: is this a legal manual write of `next` onto `lead`?
// Returns { ok, reason }. Rejects derived statuses and a gated `lost`.
export function validateLeadStatusWrite(lead, deals, next) {
  if (next === LEAD_STATUS.IN_DISCUSSION || next === LEAD_STATUS.WON) {
    return {
      ok: false,
      reason: `"${next}" is derived and cannot be set directly.`,
    };
  }
  if (!MANUAL_LEAD_STATUSES.includes(next) && next !== LEAD_STATUS.LOST) {
    return { ok: false, reason: `Unknown lead status "${next}".` };
  }
  if (isManualStatusLocked(lead, deals)) {
    return { ok: false, reason: "Lead is Won; its status is locked." };
  }
  if (next === LEAD_STATUS.LOST && !canSetLost(lead, deals)) {
    return {
      ok: false,
      reason: "Can't set Lost while an approved deal exists.",
    };
  }
  return { ok: true, reason: "" };
}

// ---- Computed deal-count columns (used by the Lead Table + sidebar strip) ---
// Pure roll-up of a lead's deals into the five computed columns (§2.3).
export function leadDealCounts(lead, deals) {
  const own = ownDeals(lead, deals);
  let dealsTotal = 0;
  let dealsLive = 0;
  let dealsStarted = 0;
  let dealsDelivered = 0;
  let wonValue = 0;
  for (const d of own) {
    if (d.stage !== "cancelled") dealsTotal += 1;
    if (isLiveStage(d.stage)) dealsLive += 1;
    if (d.stage === "project_started") dealsStarted += 1;
    if (d.stage === "project_delivered") dealsDelivered += 1;
    if (d.approval === DEAL_APPROVAL.APPROVED) {
      wonValue += Number(d.finalAmount) || 0;
    }
  }
  return { dealsTotal, dealsLive, dealsStarted, dealsDelivered, wonValue };
}
