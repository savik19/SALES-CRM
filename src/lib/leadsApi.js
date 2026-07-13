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

// Simulate a tiny network delay so loading states are exercised during dev.
// Only used by the mock branch; delete along with the mock data later.
function simulateLatency(value, ms = 150) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// Small helper for the real API branch: fetch JSON or throw a useful error.
async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    // TODO(backend): add auth headers/credentials once auth exists, e.g.
    // credentials: "include" (Sanctum cookie) or an Authorization token.
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * GET /api/leads — list leads.
 * @returns {Promise<import('@/lib/types').Lead[]>}
 */
export async function getLeads() {
  if (!USE_MOCK_DATA) return apiGet("/api/leads");
  return simulateLatency(MOCK_LEADS);
}

/**
 * GET /api/leads/:leadId — a single lead.
 * @param {string} leadId
 * @returns {Promise<import('@/lib/types').Lead|null>}
 */
export async function getLeadById(leadId) {
  if (!USE_MOCK_DATA) return apiGet(`/api/leads/${leadId}`);
  const lead = MOCK_LEADS.find((l) => l.leadId === leadId) || null;
  return simulateLatency(lead);
}

/**
 * PATCH /api/leads/:leadId — update a lead. (Not used by this read-only screen
 * yet; kept as the write template for later.)
 * @param {string} leadId
 * @param {Partial<import('@/lib/types').Lead>} changes
 * @returns {Promise<import('@/lib/types').Lead>}
 */
export async function updateLead(leadId, changes) {
  if (!USE_MOCK_DATA) {
    const res = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(changes),
    });
    if (!res.ok)
      throw new Error(`PATCH /api/leads/${leadId} failed: ${res.status}`);
    return res.json();
  }

  // ---- mock branch (does NOT persist) ----
  const lead = MOCK_LEADS.find((l) => l.leadId === leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  return simulateLatency({ ...lead, ...changes });
}
