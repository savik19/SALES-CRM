// ===========================================================================
//  MOCK DEAL DATA  (Lead → Deal model)
// ===========================================================================
//  A Deal is ONE confirmed offering (a single service or product) that belongs
//  to a Lead. A lead can hold many deals — now and in future. Money, status,
//  approval, commission and target all live on the DEAL, not the lead.
//
//  The UI never imports these rows directly; it goes through `src/lib/dealsApi`
//  (mock now, real fetch later — the return shape stays identical). This file
//  only SEEDS deals by deriving them from the existing mock leads so the app has
//  data to show; a real backend stores deals as their own table.
//
//  Deal shape (see src/lib/types.js → Deal for the full contract):
//    dealId, leadId, companyId, offeringId, ownerId, dealStatus,
//    quotedAmount, closedAmount, createdDate,
//    approvalStatus, approvalRequest, approvalReason, wonApprovedDate,
//    approvalDecidedBy, approvalDecidedDate,
//    paymentStatus, receivedAmount, notes
// ===========================================================================

import {
  MOCK_LEADS,
  OFFERING_ID_BY_NAME,
  CREDITED_DEAL_STATUSES,
  LOST_REASONS,
} from "./mockLeads";

// Map a lead's current (flat) status to the equivalent DEAL status, so the seed
// deals land in sensible pipeline stages. A real backend won't need this — deals
// carry their own status from creation.
const LEAD_TO_DEAL_STATUS = {
  Won: "Won",
  "Project Started": "Project Started",
  "Project Delivered": "Project Delivered",
  Closed: "Closed",
  "Proposal Sent": "Proposal Sent",
  Negotiation: "Negotiation",
  "Meeting Done": "Open",
  "Meeting Scheduled": "Open",
  Qualified: "Open",
  Interested: "Open",
  "Details Shared": "Open",
  Lost: "Lost",
  Cancelled: "Cancelled",
  "On Hold": "On Hold",
};
// Early prospecting statuses produce NO deals yet (still just interest).
const NO_DEAL_STATUSES = new Set(["New", "Attempted", "Contacted"]);

// The offerings a lead has actually committed to (for the deal seed): onboarded
// first (won), else interested, else pitched, else a sensible default.
function committedOfferingIds(lead) {
  const pools = [
    lead.servicesOnboarded,
    lead.servicesInterested,
    lead.servicesPitched,
  ];
  for (const pool of pools) {
    const ids = (pool || []).map((n) => OFFERING_ID_BY_NAME[n]).filter(Boolean);
    if (ids.length) return [...new Set(ids)];
  }
  return ["svc-custom-software"];
}

// Turn one lead into zero or more deals.
function dealsForLead(lead) {
  if (NO_DEAL_STATUSES.has(lead.leadStatus)) return [];
  const dealStatus = LEAD_TO_DEAL_STATUS[lead.leadStatus];
  if (!dealStatus) return [];

  const offeringIds = committedOfferingIds(lead);
  // Credited = approved (Project Started onward). "Won" = the client has agreed
  // (finalized amount set) but it hasn't been sent for / granted approval yet.
  const credited = CREDITED_DEAL_STATUSES.has(dealStatus);
  const agreed = dealStatus === "Won";
  const isLost = dealStatus === "Lost";
  const num = parseInt(String(lead.leadId).replace(/\D/g, ""), 10) || 0;

  return offeringIds.map((offeringId, i) => {
    // The LEAD no longer carries money, so seed a deterministic (per lead +
    // offering) amount so the demo has realistic-looking figures.
    const quotedAmount = 80000 + ((num + i * 13) % 15) * 20000; // 80k–360k
    // The finalized amount is known once the client agrees (Won) or later —
    // seeded ~10% below the quote.
    const closedAmount =
      credited || agreed ? Math.round(quotedAmount * 0.9) : null;
    return {
      dealId: `DEAL-${num}-${i + 1}`,
      leadId: lead.leadId,
      companyId: lead.companyId,
      offeringId,
      ownerId: lead.assignedDscId || "",
      dealStatus,
      quotedAmount,
      closedAmount,
      lostReason: isLost ? LOST_REASONS[num % LOST_REASONS.length] : "",
      createdDate: lead.assignedDate || "",
      approvalStatus: credited ? "approved" : "",
      approvalRequest: null,
      approvalReason: "",
      wonApprovedDate: credited ? lead.closedDate || "" : "",
      approvalDecidedBy: credited ? "u-admin" : "",
      approvalDecidedDate: credited ? lead.closedDate || "" : "",
      // Lightweight payment groundwork: approved (credited) deals seed as Paid.
      paymentStatus: credited ? "Paid" : "Pending",
      receivedAmount: credited ? closedAmount || 0 : 0,
      notes: "",
    };
  });
}

export const MOCK_DEALS = MOCK_LEADS.flatMap(dealsForLead);
