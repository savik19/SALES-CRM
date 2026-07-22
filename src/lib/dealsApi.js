// ===========================================================================
//  DEALS DATA ACCESS LAYER  →  the ONE place to swap mock deals for the real API
// ===========================================================================
//  The UI never imports deal rows directly — every screen calls the functions
//  below. To go live, fill in the `fetch(...)` calls (templates provided); the
//  mock branch falls away and the UI keeps working because the RETURN SHAPE
//  stays identical (see src/lib/types.js → Deal and docs/API_CONTRACT.md).
//
//  A Deal is ONE offering under a Lead (Lead → Deal model). Money, status,
//  approval, commission and target all live here. `POST /api/deals`,
//  `PATCH /api/deals/:id`, and the win-approval endpoints mirror the leads API.
// ===========================================================================

import { MOCK_DEALS } from "@/data/mockDeals";
import { API_BASE_URL, USE_MOCK_DATA } from "@/lib/config";

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

// Mock helper: mutate the shared MOCK_DEALS record in place so a change on one
// screen (a DSC's win request) is visible on another (the Admin's Approvals
// screen) within the session. A real backend persists to the DB.
function mockPatch(dealId, changes) {
  const deal = MOCK_DEALS.find((d) => d.dealId === dealId);
  if (deal) Object.assign(deal, changes);
  return deal ? { ...deal } : { dealId, ...changes };
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
 * @returns {Promise<import('@/lib/types').Deal[]>}
 */
export async function getDealsByLead(leadId) {
  if (!USE_MOCK_DATA) return apiGet(`/api/leads/${leadId}/deals`);
  return simulateLatency(
    MOCK_DEALS.filter((d) => d.leadId === leadId).map((d) => ({ ...d }))
  );
}

/**
 * POST /api/deals — create a deal for a lead (one offering). The backend assigns
 * the id. Enforce that the parent lead is Interested/qualified server-side.
 * @param {Partial<import('@/lib/types').Deal>} deal
 * @returns {Promise<import('@/lib/types').Deal>}
 */
export async function createDeal(deal) {
  if (!USE_MOCK_DATA) return apiSend("POST", `/api/deals`, deal);
  const dealId = deal.dealId || `DEAL-NEW-${++_newDealSeq}`;
  const record = {
    dealStatus: "Open",
    quotedAmount: null,
    closedAmount: null,
    approvalStatus: "",
    approvalRequest: null,
    approvalReason: "",
    wonApprovedDate: "",
    paymentStatus: "Pending",
    receivedAmount: 0,
    notes: "",
    ...deal,
    dealId,
  };
  MOCK_DEALS.unshift(record);
  return simulateLatency({ ...record });
}

/**
 * PATCH /api/deals/:dealId — update a deal's fields (status, value, owner…).
 * @param {string} dealId
 * @param {Partial<import('@/lib/types').Deal>} changes
 * @returns {Promise<import('@/lib/types').Deal>}
 */
export async function updateDeal(dealId, changes) {
  if (!USE_MOCK_DATA) return apiSend("PATCH", `/api/deals/${dealId}`, changes);
  return simulateLatency(mockPatch(dealId, changes));
}

/**
 * POST /api/deals/:dealId/request-win — the deal owner requests Admin approval
 * to win the deal. `payload` snapshots the financials. Sets approvalStatus
 * "pending"; the dealStatus becomes "Won" only when the Admin approves.
 * @param {string} dealId
 * @param {{requestedBy:string, requestedDate:string, quotedAmount:number,
 *   closedAmount:number, note?:string}} payload
 */
export async function requestDealWin(dealId, payload) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/request-win`, payload);
  return simulateLatency(
    mockPatch(dealId, {
      approvalStatus: "pending",
      approvalRequest: payload,
      approvalReason: "",
    })
  );
}

/**
 * POST /api/deals/:dealId/approve-win — Admin approves: applies the requested
 * financials, advances the deal to the requested gated stage (default
 * "Project Started") and stamps wonApprovedDate (the deal is now credited for
 * target + commission). Admin-only.
 * @param {string} dealId
 * @param {{adminId:string, approvedDate:string}} decision
 */
export async function approveDealWin(dealId, { adminId, approvedDate }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/approve-win`, {
      adminId,
      approvedDate,
    });
  const deal = MOCK_DEALS.find((d) => d.dealId === dealId);
  const req = deal?.approvalRequest || {};
  return simulateLatency(
    mockPatch(dealId, {
      dealStatus: req.requestedStatus || "Project Started",
      quotedAmount: req.quotedAmount ?? deal?.quotedAmount,
      closedAmount: req.closedAmount ?? deal?.closedAmount,
      wonApprovedDate: approvedDate,
      approvalStatus: "approved",
      approvalDecidedBy: adminId,
      approvalDecidedDate: approvedDate,
    })
  );
}

/**
 * POST /api/deals/:dealId/reject-win — Admin rejects with a reason; the deal
 * keeps its prior status so the owner can revise and resubmit.
 * @param {string} dealId
 * @param {{adminId:string, reason:string, decidedDate:string}} decision
 */
export async function rejectDealWin(dealId, { adminId, reason, decidedDate }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/deals/${dealId}/reject-win`, {
      adminId,
      reason,
      decidedDate,
    });
  return simulateLatency(
    mockPatch(dealId, {
      approvalStatus: "rejected",
      approvalReason: reason,
      approvalDecidedBy: adminId,
      approvalDecidedDate: decidedDate,
    })
  );
}
