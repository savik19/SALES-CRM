// ===========================================================================
//  DEALS DATA ACCESS LAYER  →  the ONE place to swap mock deals for the real API
// ===========================================================================
//  The UI never imports deal rows directly — every screen calls the functions
//  below. To go live, fill in the `fetch(...)` calls (templates provided); the
//  mock branch falls away because the RETURN SHAPE stays identical (see
//  src/lib/types.js → Deal and docs/API_CONTRACT.md).
//
//  A Deal has TWO independent fields (see lib/statuses): `stage` (the pipeline)
//  and `approval` (the money control). The approval flow — request → approve /
//  reject / deliver / reverse — is the money event: it writes to the commission
//  LEDGER (accrual on approve, release on deliver, reversal on reverse) and the
//  AUDIT trail. Every rule enforced here is ALSO documented in API_CONTRACT.md so
//  the Laravel team mirrors it server-side. TODO(backend): the ledger + audit
//  writes belong on the server; the UI must never write them directly.
// ===========================================================================

import { MOCK_DEALS } from "@/data/mockDeals";
import { API_BASE_URL, USE_MOCK_DATA } from "@/lib/config";
import { DEAL_STAGE, DEAL_APPROVAL, labelOf } from "@/lib/statuses";
import { recordAudit } from "@/lib/audit";
import { recordLedgerEntry, ENTRY_TYPE } from "@/lib/commissionLedger";

function simulateLatency(value, ms = 150) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    // TODO(backend): add auth headers/credentials once auth exists.
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiSend(method, path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  return res.json();
}

// Mutate the shared MOCK_DEALS record in place so a change on one screen is
// visible on another within the session. A real backend persists to the DB.
function mockGet(dealId) {
  return MOCK_DEALS.find((d) => d.dealId === dealId);
}
function mockPatch(dealId, changes) {
  const deal = mockGet(dealId);
  if (deal) Object.assign(deal, changes);
  return deal ? { ...deal } : { dealId, ...changes };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

let _newDealSeq = 0;

/**
 * GET /api/deals — list all deals. The backend scopes by the authenticated
 * user; the mock returns everything and the UI applies the role/focus view.
 * @returns {Promise<import('@/lib/types').Deal[]>}
 */
export async function getDeals() {
  if (!USE_MOCK_DATA) return apiGet("/api/deals");
  return simulateLatency(MOCK_DEALS.map((d) => ({ ...d })));
}

/**
 * GET /api/leads/:leadId/deals — the deals belonging to one lead.
 * @param {string} leadId
 */
export async function getDealsByLead(leadId) {
  if (!USE_MOCK_DATA) return apiGet(`/api/leads/${leadId}/deals`);
  return simulateLatency(
    MOCK_DEALS.filter((d) => d.leadId === leadId).map((d) => ({ ...d }))
  );
}

/**
 * POST /api/deals — create a deal for a lead (one offering). New deals start at
 * stage `open`, approval `not_requested`. The backend assigns the id.
 * @param {Partial<import('@/lib/types').Deal>} deal
 */
export async function createDeal(deal) {
  if (!USE_MOCK_DATA) return apiSend("POST", `/api/deals`, deal);
  const dealId = deal.dealId || `DEAL-NEW-${++_newDealSeq}`;
  const record = {
    stage: DEAL_STAGE.OPEN,
    approval: DEAL_APPROVAL.NOT_REQUESTED,
    quotedAmount: null,
    finalAmount: null,
    lostReason: "",
    approvalRequest: null,
    approvalReason: "",
    wonApprovedDate: "",
    deliveredDate: "",
    approvalDecidedBy: "",
    approvalDecidedDate: "",
    paymentStatus: "Pending",
    receivedAmount: 0,
    notes: "",
    createdDate: today(),
    ...deal,
    dealId,
  };
  MOCK_DEALS.unshift(record);
  return simulateLatency({ ...record });
}

// Fields we track in the audit trail on a plain PATCH.
const AUDITED_FIELDS = [
  { key: "stage", label: "stage" },
  { key: "finalAmount", label: "finalAmount" },
  { key: "quotedAmount", label: "quotedAmount" },
  { key: "ownerId", label: "owner" },
  { key: "offeringId", label: "offering" },
];

/**
 * PATCH /api/deals/:dealId — update a deal's plain fields (stage, amounts,
 * owner, offering). Records an audit entry per tracked field that changed.
 * `actor` = { id, role } (for the audit trail). Approval transitions have their
 * own endpoints below — do NOT set `approval` through here.
 * @param {string} dealId
 * @param {Partial<import('@/lib/types').Deal>} changes
 * @param {{actor?:{id:string,role:string}}} [opts]
 */
export async function updateDeal(dealId, changes, { actor } = {}) {
  if (!USE_MOCK_DATA) return apiSend("PATCH", `/api/deals/${dealId}`, changes);
  const before = mockGet(dealId);
  if (before && actor) {
    for (const { key, label } of AUDITED_FIELDS) {
      if (key in changes && changes[key] !== before[key]) {
        recordAudit({
          entityType: "deal",
          entityId: dealId,
          field: label,
          from: key === "stage" ? labelOf(before[key]) : before[key],
          to: key === "stage" ? labelOf(changes[key]) : changes[key],
          actor,
        });
      }
    }
  }
  return simulateLatency(mockPatch(dealId, changes));
}

/**
 * POST /api/deals/:dealId/request-approval — the owner submits the deal for
 * Admin approval to start the project. Sets approval `pending` (stage freezes).
 * `payload` snapshots the financials. Enforce the eligibility gate server-side.
 * @param {string} dealId
 * @param {{actor:{id:string,role:string}, payload:object}} args
 */
export async function requestApproval(dealId, { actor, payload }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/request-approval`, payload);
  const before = mockGet(dealId);
  recordAudit({
    entityType: "deal",
    entityId: dealId,
    field: "approval",
    from: labelOf(before?.approval),
    to: labelOf(DEAL_APPROVAL.PENDING),
    actor,
  });
  return simulateLatency(
    mockPatch(dealId, {
      approval: DEAL_APPROVAL.PENDING,
      approvalRequest: payload || null,
      approvalReason: "",
    })
  );
}

/**
 * POST /api/deals/:dealId/withdraw-approval — the owner withdraws a pending
 * request; the deal returns to `not_requested` and becomes editable again.
 */
export async function withdrawApproval(dealId, { actor }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/withdraw-approval`, {});
  const before = mockGet(dealId);
  recordAudit({
    entityType: "deal",
    entityId: dealId,
    field: "approval",
    from: labelOf(before?.approval),
    to: labelOf(DEAL_APPROVAL.NOT_REQUESTED),
    actor,
  });
  return simulateLatency(
    mockPatch(dealId, {
      approval: DEAL_APPROVAL.NOT_REQUESTED,
      approvalRequest: null,
    })
  );
}

/**
 * POST /api/deals/:dealId/approve — ADMIN ONLY. Atomically: approval →
 * `approved`, stage → `project_started`, write a commission ACCRUAL ledger
 * entry for the owner, and append an audit entry. `config` prices the accrual.
 * @param {string} dealId
 * @param {{actor:{id:string,role:string}, config:object, approvedDate?:string}} args
 */
export async function approveDeal(dealId, { actor, config, approvedDate }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/approve`, {
      adminId: actor?.id,
      approvedDate,
    });
  const deal = mockGet(dealId);
  const req = deal?.approvalRequest || {};
  const date = approvedDate || today();
  const patched = mockPatch(dealId, {
    approval: DEAL_APPROVAL.APPROVED,
    stage: DEAL_STAGE.PROJECT_STARTED,
    quotedAmount: req.quotedAmount ?? deal?.quotedAmount,
    finalAmount: req.finalAmount ?? deal?.finalAmount,
    wonApprovedDate: date,
    approvalDecidedBy: actor?.id || "u-admin",
    approvalDecidedDate: date,
  });
  // Money event: accrue commission for the owner (held until delivery).
  recordLedgerEntry({
    type: ENTRY_TYPE.ACCRUAL,
    deal: mockGet(dealId),
    config,
    createdBy: actor?.id || "u-admin",
  });
  recordAudit({
    entityType: "deal",
    entityId: dealId,
    field: "approval",
    from: labelOf(DEAL_APPROVAL.PENDING),
    to: labelOf(DEAL_APPROVAL.APPROVED),
    actor,
  });
  return simulateLatency(patched);
}

/**
 * POST /api/deals/:dealId/reject — ADMIN ONLY. approval → `rejected`, stage
 * unchanged, rejection REASON required. The deal returns to editable.
 */
export async function rejectDeal(dealId, { actor, reason, decidedDate }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/reject`, {
      adminId: actor?.id,
      reason,
      decidedDate,
    });
  const date = decidedDate || today();
  recordAudit({
    entityType: "deal",
    entityId: dealId,
    field: "approval",
    from: labelOf(DEAL_APPROVAL.PENDING),
    to: labelOf(DEAL_APPROVAL.REJECTED),
    actor,
    reason,
  });
  return simulateLatency(
    mockPatch(dealId, {
      approval: DEAL_APPROVAL.REJECTED,
      approvalReason: reason,
      approvalDecidedBy: actor?.id || "u-admin",
      approvalDecidedDate: date,
    })
  );
}

/**
 * POST /api/deals/:dealId/deliver — ADMIN ONLY, on an approved deal. stage →
 * `project_delivered`. RELEASES the held commission (ledger release entry).
 */
export async function deliverDeal(dealId, { actor, config, date }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/deliver`, {
      adminId: actor?.id,
    });
  const d = date || today();
  const patched = mockPatch(dealId, {
    stage: DEAL_STAGE.PROJECT_DELIVERED,
    deliveredDate: d,
  });
  recordLedgerEntry({
    type: ENTRY_TYPE.RELEASE,
    deal: mockGet(dealId),
    config,
    createdBy: actor?.id || "u-admin",
  });
  recordAudit({
    entityType: "deal",
    entityId: dealId,
    field: "stage",
    from: labelOf(DEAL_STAGE.PROJECT_STARTED),
    to: labelOf(DEAL_STAGE.PROJECT_DELIVERED),
    actor,
  });
  return simulateLatency(patched);
}

/**
 * POST /api/deals/:dealId/reverse — ADMIN ONLY, on an approved deal. Atomically:
 * approval → `reversed`, stage → `cancelled`, REASON required, and write a
 * NEGATIVE ledger entry reversing the accrual. A started project that fell through.
 */
export async function reverseDeal(dealId, { actor, config, reason, date }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/reverse`, {
      adminId: actor?.id,
      reason,
    });
  const d = date || today();
  const patched = mockPatch(dealId, {
    approval: DEAL_APPROVAL.REVERSED,
    stage: DEAL_STAGE.CANCELLED,
    approvalReason: reason,
    approvalDecidedBy: actor?.id || "u-admin",
    approvalDecidedDate: d,
  });
  recordLedgerEntry({
    type: ENTRY_TYPE.REVERSAL,
    deal: mockGet(dealId),
    config,
    createdBy: actor?.id || "u-admin",
    reason,
  });
  recordAudit({
    entityType: "deal",
    entityId: dealId,
    field: "approval",
    from: labelOf(DEAL_APPROVAL.APPROVED),
    to: labelOf(DEAL_APPROVAL.REVERSED),
    actor,
    reason,
  });
  return simulateLatency(patched);
}
