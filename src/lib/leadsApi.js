// ===========================================================================
//  DATA ACCESS LAYER  →  the ONE place to swap mock data for the real API
// ===========================================================================
//  Laravel team: the UI never imports mock data directly. Every screen calls
//  the functions below. To go live, replace the bodies here with `fetch(...)`
//  calls to your REST/JSON endpoints — the return SHAPE must stay the same
//  (see the lead shape documented in src/data/mockLeads.js) and the UI keeps
//  working untouched.
//
//  Example of what a real implementation might look like:
//
//      export async function getLeads() {
//        const res = await fetch(`${API_BASE}/api/leads`);
//        if (!res.ok) throw new Error("Failed to load leads");
//        return res.json();   // must return an array of leads in the same shape
//      }
//
//  Everything is async on purpose so the swap needs zero changes in the UI.
// ===========================================================================

import { MOCK_LEADS } from "@/data/mockLeads";

// Simulate a tiny network delay so loading states are exercised during dev.
// Remove this when the real API is wired in.
function simulateLatency(value, ms = 150) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// GET /api/leads  → all leads (the API/backend applies role scoping; see note).
//
// ROLE SCOPING (Brief §4): a DSC must only see their own leads, a BDM sees all.
// That filtering is the backend's job (it knows who is logged in). For the mock
// we accept an optional `currentUser` so the frontend can preview the behaviour.
export async function getLeads({ currentUser } = {}) {
  let leads = MOCK_LEADS;

  // TODO(backend): the real API scopes by the authenticated user server-side.
  // This client-side filter is only to preview the DSC vs BDM experience.
  if (currentUser && currentUser.role === "dsc") {
    leads = leads.filter((l) => l.assignedDscId === currentUser.id);
  }

  return simulateLatency(leads);
}

// GET /api/leads/:id  → a single lead.
export async function getLeadById(id) {
  const lead = MOCK_LEADS.find((l) => l.id === id) || null;
  return simulateLatency(lead);
}

// PATCH /api/leads/:id  → update a lead (e.g. change status, reassign DSC).
//
// Mock version just returns the merged object; it does NOT persist. Wire this
// to your update endpoint and the UI's optimistic updates will become real.
export async function updateLead(id, changes) {
  const lead = MOCK_LEADS.find((l) => l.id === id);
  if (!lead) throw new Error(`Lead ${id} not found`);
  // TODO(backend): PATCH the change set and return the server's canonical row.
  return simulateLatency({ ...lead, ...changes });
}
