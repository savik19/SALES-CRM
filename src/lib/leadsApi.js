// ===========================================================================
//  DATA ACCESS LAYER  →  the ONE place to swap mock data for the real API
// ===========================================================================
//  The UI never imports mock data directly. Every screen calls the functions
//  below. To go live, fill in the `fetch(...)` calls (templates are provided in
//  each function) and the mock branch falls away — the UI keeps working because
//  the RETURN SHAPE stays the same (see src/lib/types.js and the master doc in
//  docs/API_CONTRACT.md).
//
//  Switching mock → live:
//    1. Build the endpoints in docs/API_CONTRACT.md.
//    2. Set NEXT_PUBLIC_API_BASE_URL in .env.local (see .env.example).
//    3. That flips USE_MOCK_DATA to false; the fetch branches below take over.
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
    // credentials: "include"  (Laravel Sanctum cookie) or an Authorization token.
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * GET /api/leads — list leads (the backend scopes by the authenticated user).
 *
 * ROLE SCOPING (Brief §4): a DSC sees only their own leads; a BDM sees all.
 * That filtering is the backend's job — it knows who is logged in. The
 * `currentUser` arg only exists so the mock can PREVIEW that behaviour; drop it
 * once auth is wired.
 *
 * @param {{ currentUser?: import('@/lib/types').TeamMember }} [opts]
 * @returns {Promise<import('@/lib/types').Lead[]>}
 */
export async function getLeads({ currentUser } = {}) {
  if (!USE_MOCK_DATA) {
    return apiGet("/api/leads");
  }

  // ---- mock branch (remove once the API is live) ----
  let leads = MOCK_LEADS;
  if (currentUser && currentUser.role === "dsc") {
    leads = leads.filter((l) => l.assignedDscId === currentUser.id);
  }
  return simulateLatency(leads);
}

/**
 * GET /api/leads/:id — a single lead.
 * @param {string} id
 * @returns {Promise<import('@/lib/types').Lead|null>}
 */
export async function getLeadById(id) {
  if (!USE_MOCK_DATA) {
    return apiGet(`/api/leads/${id}`);
  }

  // ---- mock branch ----
  const lead = MOCK_LEADS.find((l) => l.id === id) || null;
  return simulateLatency(lead);
}

/**
 * PATCH /api/leads/:id — update a lead (e.g. change status, reassign DSC).
 * @param {string} id
 * @param {Partial<import('@/lib/types').Lead>} changes
 * @returns {Promise<import('@/lib/types').Lead>}
 */
export async function updateLead(id, changes) {
  if (!USE_MOCK_DATA) {
    const res = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(changes),
    });
    if (!res.ok)
      throw new Error(`PATCH /api/leads/${id} failed: ${res.status}`);
    return res.json();
  }

  // ---- mock branch (does NOT persist) ----
  const lead = MOCK_LEADS.find((l) => l.id === id);
  if (!lead) throw new Error(`Lead ${id} not found`);
  return simulateLatency({ ...lead, ...changes });
}
