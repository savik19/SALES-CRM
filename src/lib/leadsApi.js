// ===========================================================================
//  DATA ACCESS LAYER  →  the ONE place to swap mock data for the real API
// ===========================================================================
//  The UI never imports mock lead rows directly. Every screen calls the
//  functions below. To go live, fill in the `fetch(...)` calls (templates are
//  provided) and the mock branch falls away — the UI keeps working because the
//  RETURN SHAPE stays the same (see src/lib/types.js and docs/API_CONTRACT.md).
//
//  Switching mock → live:
//    1. Build the endpoints in docs/API_CONTRACT.md.
//    2. Set NEXT_PUBLIC_API_BASE_URL in .env.local (see .env.example).
//    3. That flips USE_MOCK_DATA to false; the fetch branches take over.
//
//  Everything is async on purpose so the swap needs zero changes in the UI.
// ===========================================================================

import { MOCK_LEADS } from "@/data/mockLeads";
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

/**
 * GET /api/leads — list leads. The backend scopes by the authenticated user;
 * the mock returns everything and the UI applies the role view (see the page).
 * @returns {Promise<import('@/lib/types').Lead[]>}
 */
export async function getLeads() {
  if (!USE_MOCK_DATA) return apiGet("/api/leads");
  // Return a shallow copy so the page can own a mutable working set.
  return simulateLatency(MOCK_LEADS.map((l) => ({ ...l })));
}

/**
 * GET /api/leads/:leadId — a single lead.
 * @param {string} leadId
 * @returns {Promise<import('@/lib/types').Lead|null>}
 */
export async function getLeadById(leadId) {
  if (!USE_MOCK_DATA) return apiGet(`/api/leads/${leadId}`);
  const lead = MOCK_LEADS.find((l) => l.leadId === leadId) || null;
  return simulateLatency(lead ? { ...lead } : null);
}

// Mock helper: mutate the shared MOCK_LEADS record in place so a change made on
// one screen (e.g. a DSC's win request) is visible on another (the Admin's
// Approvals screen) within the session. A real backend persists to the DB.
function mockPatch(leadId, changes) {
  const lead = MOCK_LEADS.find((l) => l.leadId === leadId);
  if (lead) Object.assign(lead, changes);
  return lead ? { ...lead } : { leadId, ...changes };
}

/**
 * PATCH /api/leads/:leadId — update a lead's fields (status, assignee, etc.).
 * @param {string} leadId
 * @param {Partial<import('@/lib/types').Lead>} changes
 * @returns {Promise<import('@/lib/types').Lead>}
 */
export async function updateLead(leadId, changes) {
  if (!USE_MOCK_DATA) return apiSend("PATCH", `/api/leads/${leadId}`, changes);
  return simulateLatency(mockPatch(leadId, changes));
}

/**
 * POST /api/leads/:leadId/request-win — a DSC requests Admin approval to move a
 * deal to "Project Started" (the credited win). `payload` snapshots the deal
 * financials + line items. Sets approvalStatus="pending"; the status does NOT
 * change to Project Started until an Admin approves. Enforce owner-only server-side.
 * @param {string} leadId
 * @param {{requestedBy:string, requestedDate:string, quotedAmount:number,
 *   closedAmount:number, lineItems:{offeringId:string,amount:number}[],
 *   note?:string}} payload
 */
export async function requestWin(leadId, payload) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/leads/${leadId}/request-win`, payload);
  return simulateLatency(
    mockPatch(leadId, {
      approvalStatus: "pending",
      approvalRequest: payload,
      approvalReason: "",
    })
  );
}

/**
 * POST /api/leads/:leadId/approve-win — Admin approves the pending win: applies
 * the requested financials, sets leadStatus to "Project Started", and stamps
 * wonApprovedDate (the win is now credited for target + commission). Admin-only.
 * @param {string} leadId
 * @param {{adminId:string, approvedDate:string}} decision
 */
export async function approveWin(leadId, { adminId, approvedDate }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/leads/${leadId}/approve-win`, {
      adminId,
      approvedDate,
    });
  const lead = MOCK_LEADS.find((l) => l.leadId === leadId);
  const req = lead?.approvalRequest || {};
  return simulateLatency(
    mockPatch(leadId, {
      leadStatus: "Project Started",
      leadStatusBeforeWin: lead?.leadStatus, // for audit / possible revert
      quotedAmount: req.quotedAmount ?? lead?.quotedAmount,
      closedAmount: req.closedAmount ?? lead?.closedAmount,
      lineItems: req.lineItems ?? lead?.lineItems,
      closedDate: approvedDate,
      wonApprovedDate: approvedDate,
      approvalStatus: "approved",
      approvalDecidedBy: adminId,
      approvalDecidedDate: approvedDate,
    })
  );
}

/**
 * POST /api/leads/:leadId/reject-win — Admin rejects the pending win with a
 * reason. The deal keeps its prior status; the DSC can revise and resubmit.
 * @param {string} leadId
 * @param {{adminId:string, reason:string, decidedDate:string}} decision
 */
export async function rejectWin(leadId, { adminId, reason, decidedDate }) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/leads/${leadId}/reject-win`, {
      adminId,
      reason,
      decidedDate,
    });
  return simulateLatency(
    mockPatch(leadId, {
      approvalStatus: "rejected",
      approvalReason: reason,
      approvalDecidedBy: adminId,
      approvalDecidedDate: decidedDate,
    })
  );
}

/**
 * POST /api/leads/assign — bulk-assign leads to one DSC (BDM action).
 * @param {string[]} leadIds
 * @param {string} dscId
 * @returns {Promise<{updated: string[]}>}
 */
export async function assignLeads(leadIds, dscId) {
  if (!USE_MOCK_DATA)
    return apiSend("POST", `/api/leads/assign`, { leadIds, dscId });
  return simulateLatency({ updated: leadIds });
}

/**
 * POST /api/leads/import — commit imported rows (BDM action). Each row arrives
 * as Lead Status = "New" and Assigned DSC = "" (unassigned).
 * @param {import('@/lib/types').Lead[]} rows
 * @returns {Promise<{imported: number}>}
 */
export async function importLeads(rows) {
  if (!USE_MOCK_DATA) return apiSend("POST", `/api/leads/import`, { rows });
  return simulateLatency({ imported: rows.length });
}
