// ---------------------------------------------------------------------------
// Commission ledger — APPEND-ONLY. Once money can be credited on approval and
// reversed later, commission stops being a number you recompute and becomes a
// list of immutable entries you sum.
//
// Entry types:
//   accrual  — written when a deal is APPROVED. The commission is "Earned (held)"
//              for the owner: motivational signal now, cash risk controlled.
//   release  — written when the project is DELIVERED. The held amount becomes
//              "Payable".
//   reversal — written when an approved deal is REVERSED (fell through). A
//              NEGATIVE entry that claws back the accrual.
//
// CRITICAL: every entry snapshots the compensation rule (`ruleSnapshot`) at the
// moment it is written. If the Admin later edits the commission % in the
// Compensation screen, historical payouts must NOT silently change — never
// recompute a past entry from current config.
//
// This module is PURE math + builders + reducers, plus a small in-memory mock
// store (the same pattern as src/data/mockDeals). The Laravel team replaces the
// store with a real `commission_ledger` table; see docs/API_CONTRACT.md.
// ---------------------------------------------------------------------------

import { findOffering, ruleAmount } from "@/lib/commission";

/**
 * @typedef {Object} CommissionEntry
 * @property {string} id
 * @property {string} dealId
 * @property {string} leadId
 * @property {string} userId        deal owner at time of the event
 * @property {'accrual'|'release'|'reversal'} type
 * @property {number} amount        signed: reversal is negative
 * @property {number} basisAmount   the finalAmount used
 * @property {string} offeringId
 * @property {string} ruleSnapshot  JSON of the comp rule AT THAT MOMENT
 * @property {string} createdAt
 * @property {string} createdBy
 * @property {string} [reason]
 */

export const ENTRY_TYPE = {
  ACCRUAL: "accrual",
  RELEASE: "release",
  REVERSAL: "reversal",
};

// Commission a role earns on an offering priced on `finalAmount`. Always from
// finalAmount, never quotedAmount. percent → finalAmount*value/100; flat → value.
export function commissionFor(offering, finalAmount, role = "dsc") {
  if (!offering) return 0;
  const rule = role === "bdm" ? offering.bdm : offering.dsc;
  return ruleAmount(rule, Number(finalAmount) || 0);
}

// Build (but do not store) an entry. Pure — caller supplies id/createdAt so the
// function has no hidden clock. `role` is whose rule to snapshot/price (the deal
// owner is a DSC; the BDM override is priced separately by analytics).
export function buildEntry({
  id,
  type,
  deal,
  config,
  role = "dsc",
  createdAt,
  createdBy,
  reason = "",
}) {
  const offering = findOffering(config, deal?.offeringId);
  const basis = Number(deal?.finalAmount) || 0;
  const magnitude = commissionFor(offering, basis, role);
  const amount = type === ENTRY_TYPE.REVERSAL ? -magnitude : magnitude;
  return {
    id,
    dealId: deal?.dealId || "",
    leadId: deal?.leadId || "",
    userId: deal?.ownerId || "",
    type,
    amount,
    basisAmount: basis,
    offeringId: deal?.offeringId || "",
    // Snapshot the exact rule so a later config edit can't rewrite history.
    ruleSnapshot: JSON.stringify(
      offering ? { dsc: offering.dsc, bdm: offering.bdm } : null
    ),
    createdAt,
    createdBy,
    reason,
  };
}

// ---- Reducers (pure) -------------------------------------------------------
// Roll a set of entries into held (accrued, not yet released) vs payable
// (released), net of reversals. Works for one user or a whole team — the caller
// filters. Reversals reduce whichever bucket their accrual sat in: an accrual
// that was reversed before release nets to 0 held; after release stays payable
// minus nothing (delivery is terminal). We compute per-deal to keep it honest.
export function rollupLedger(entries) {
  const byDeal = new Map();
  for (const e of entries || []) {
    const cur = byDeal.get(e.dealId) || {
      accrued: 0,
      released: 0,
      reversed: 0,
    };
    if (e.type === ENTRY_TYPE.ACCRUAL) cur.accrued += e.amount;
    else if (e.type === ENTRY_TYPE.RELEASE) cur.released += e.amount;
    else if (e.type === ENTRY_TYPE.REVERSAL) cur.reversed += -e.amount; // magnitude
    byDeal.set(e.dealId, cur);
  }
  let held = 0;
  let payable = 0;
  for (const { accrued, released, reversed } of byDeal.values()) {
    if (reversed > 0) continue; // fully clawed back → contributes nothing
    if (released > 0) payable += released;
    else held += accrued;
  }
  return { held, payable, total: held + payable };
}

// Sum entries for one user (filter helper).
export function ledgerForUser(entries, userId) {
  return (entries || []).filter((e) => e.userId === userId);
}
export function ledgerForDeal(entries, dealId) {
  return (entries || []).filter((e) => e.dealId === dealId);
}

// ---- In-memory mock store --------------------------------------------------
// Seeded empty; dealsApi appends on approve/deliver/reverse within a session.
// TODO(backend): replace with GET /api/commission-ledger (read) — entries are
// written server-side by the approve/deliver/reverse endpoints, never by the UI.
export const MOCK_LEDGER = [];

let _seq = 0;
function nextId() {
  _seq += 1;
  return `LEDG-${_seq}`;
}

// Append an entry for a deal transition. Returns the stored entry (a copy).
export function recordLedgerEntry({ type, deal, config, createdBy, reason }) {
  const entry = buildEntry({
    id: nextId(),
    type,
    deal,
    config,
    role: "dsc",
    createdAt: new Date().toISOString().slice(0, 10),
    createdBy,
    reason,
  });
  MOCK_LEDGER.push(entry);
  return { ...entry };
}

export function getLedgerEntries() {
  return MOCK_LEDGER.map((e) => ({ ...e }));
}

// One-time seed so historical (pre-loaded) deals have ledger entries matching
// their approval state — approved → accrual (+ release if delivered), reversed →
// accrual + reversal. No-op once the ledger has any entries. Called by useDeals
// on first load (it has both the deals and the config). TODO(backend): the real
// ledger is written by the approve/deliver/reverse endpoints; no seeding needed.
export function seedLedgerFromDeals(deals, config, adminId = "u-admin") {
  if (MOCK_LEDGER.length > 0) return;
  for (const deal of deals || []) {
    const at = deal.wonApprovedDate || deal.createdDate || "";
    if (deal.approval === "approved") {
      MOCK_LEDGER.push(
        buildEntry({
          id: nextId(),
          type: ENTRY_TYPE.ACCRUAL,
          deal,
          config,
          createdAt: at,
          createdBy: adminId,
        })
      );
      if (deal.stage === "project_delivered") {
        MOCK_LEDGER.push(
          buildEntry({
            id: nextId(),
            type: ENTRY_TYPE.RELEASE,
            deal,
            config,
            createdAt: deal.deliveredDate || at,
            createdBy: adminId,
          })
        );
      }
    } else if (deal.approval === "reversed") {
      MOCK_LEDGER.push(
        buildEntry({
          id: nextId(),
          type: ENTRY_TYPE.ACCRUAL,
          deal,
          config,
          createdAt: at,
          createdBy: adminId,
        })
      );
      MOCK_LEDGER.push(
        buildEntry({
          id: nextId(),
          type: ENTRY_TYPE.REVERSAL,
          deal,
          config,
          createdAt: deal.approvalDecidedDate || at,
          createdBy: adminId,
          reason: deal.approvalReason || "",
        })
      );
    }
  }
}
