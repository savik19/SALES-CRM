// ===========================================================================
//  MOCK DEAL DATA  (Lead → Deal model, new status taxonomy)
// ===========================================================================
//  A Deal is ONE confirmed offering under a Lead. A lead can hold many deals.
//  Money, stage, approval and commission all live on the DEAL, not the lead.
//
//  A deal has TWO independent fields (see lib/statuses):
//    stage    — open · proposal_sent · negotiation · project_started ·
//               project_delivered · cancelled
//    approval — not_requested · pending · approved · rejected · reversed
//
//  The UI never imports these rows directly; it goes through src/lib/dealsApi.
//  This file only SEEDS deals from the mock leads so the app has data to show.
//
//  The seed also plants the six testable scenarios from the brief (§8) via
//  DEAL_SEED_OVERRIDES so every rule can be exercised by clicking.
// ===========================================================================

import { MOCK_LEADS, OFFERING_ID_BY_NAME, LOST_REASONS } from "./mockLeads";
import { DEAL_STAGE, DEAL_APPROVAL } from "@/lib/statuses";

// The offerings a lead has committed to (for the deal seed): onboarded first
// (won), else interested, else pitched, else a sensible default.
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

// A deterministic (per lead + offering) amount so the demo has realistic figures.
function amountsFor(num, i, hasFinal) {
  const quotedAmount = 80000 + ((num + i * 13) % 15) * 20000; // 80k–360k
  const finalAmount = hasFinal ? Math.round(quotedAmount * 0.9) : null; // ~10% off
  return { quotedAmount, finalAmount };
}

// Build one deal record. `spec` = { stage, approval } describes where it sits.
function makeDeal(lead, offeringId, i, spec) {
  const num = parseInt(String(lead.leadId).replace(/\D/g, ""), 10) || 0;
  const approved = spec.approval === DEAL_APPROVAL.APPROVED;
  const reversed = spec.approval === DEAL_APPROVAL.REVERSED;
  const delivered = spec.stage === DEAL_STAGE.PROJECT_DELIVERED;
  const cancelled = spec.stage === DEAL_STAGE.CANCELLED;
  // Final amount is known once the client agrees (proposal onward) or it's been
  // approved / reversed (it was approved once).
  const hasFinal =
    approved ||
    reversed ||
    spec.stage === DEAL_STAGE.PROPOSAL_SENT ||
    spec.stage === DEAL_STAGE.NEGOTIATION ||
    spec.approval === DEAL_APPROVAL.PENDING;
  const { quotedAmount, finalAmount } = amountsFor(num, i, hasFinal);
  const decidedDate = lead.closedDate || lead.assignedDate || "";

  return {
    dealId: `DEAL-${num}-${i + 1}`,
    leadId: lead.leadId,
    companyId: lead.companyId,
    offeringId,
    ownerId: lead.assignedDscId || "",
    stage: spec.stage,
    approval: spec.approval,
    quotedAmount,
    finalAmount,
    lostReason:
      cancelled && !reversed ? LOST_REASONS[num % LOST_REASONS.length] : "",
    createdDate: lead.assignedDate || "",
    approvalRequest:
      spec.approval === DEAL_APPROVAL.PENDING
        ? {
            requestedBy: lead.assignedDscId || "",
            requestedDate: lead.lastContactDate || lead.assignedDate || "",
            quotedAmount,
            finalAmount,
          }
        : null,
    approvalReason: reversed ? "Client cancelled; project fell through." : "",
    wonApprovedDate: approved || reversed ? decidedDate : "",
    deliveredDate: delivered ? decidedDate : "",
    approvalDecidedBy: approved || reversed ? "u-admin" : "",
    approvalDecidedDate: approved || reversed ? decidedDate : "",
    paymentStatus: approved ? "Paid" : "Pending",
    receivedAmount: approved ? finalAmount || 0 : 0,
    notes: "",
  };
}

// The generic per-lead seed: map the lead's stored status hint (`_legacyStatus`,
// kept by mockLeads for seeding only) to a single deal spec. null → no deal.
const NOT = DEAL_APPROVAL.NOT_REQUESTED;
const APPR = DEAL_APPROVAL.APPROVED;
const LEGACY_TO_DEALSPEC = {
  "Proposal Sent": { stage: DEAL_STAGE.PROPOSAL_SENT, approval: NOT },
  Negotiation: { stage: DEAL_STAGE.NEGOTIATION, approval: NOT },
  Won: { stage: DEAL_STAGE.PROJECT_STARTED, approval: APPR },
  "Project Started": { stage: DEAL_STAGE.PROJECT_STARTED, approval: APPR },
  "Project Delivered": { stage: DEAL_STAGE.PROJECT_DELIVERED, approval: APPR },
  Closed: { stage: DEAL_STAGE.PROJECT_DELIVERED, approval: APPR },
  Cancelled: { stage: DEAL_STAGE.CANCELLED, approval: DEAL_APPROVAL.REVERSED },
  // New/Attempted/Contacted/Details Shared/Interested/Qualified/Meeting*/On Hold/
  // Lost → no seeded deal (manual pre-deal lead, or a pure lost prospect).
};

// Explicit multi-deal overrides that plant the brief's six test scenarios. Keyed
// by leadId; each entry is an array of { offering, stage, approval }.
const S = DEAL_STAGE;
const A = DEAL_APPROVAL;
const DEAL_SEED_OVERRIDES = {
  // (1) 2 live deals + 1 delivered → lead renders Won.
  SCRIPT8008: [
    {
      offering: "Custom Software",
      stage: S.PROJECT_DELIVERED,
      approval: A.APPROVED,
    },
    { offering: "Mobile App", stage: S.OPEN, approval: A.NOT_REQUESTED },
    { offering: "AI Tools", stage: S.NEGOTIATION, approval: A.NOT_REQUESTED },
  ],
  // (2) only cancelled deals → Lost stays selectable (no approved deal).
  SCRIPT8013: [
    {
      offering: "Custom Software",
      stage: S.CANCELLED,
      approval: A.NOT_REQUESTED,
    },
  ],
  // (4) a pending deal → stage locked for everyone.
  SCRIPT8018: [
    {
      offering: "SaaS Subscription",
      stage: S.NEGOTIATION,
      approval: A.PENDING,
    },
  ],
  // (5) a reversed deal with its negative ledger entry present.
  SCRIPT8026: [
    { offering: "SaaS Subscription", stage: S.CANCELLED, approval: A.REVERSED },
  ],
  // (6) previously-Won lead with a brand-new open deal → stays Won.
  SCRIPT8036: [
    {
      offering: "Website Development",
      stage: S.PROJECT_DELIVERED,
      approval: A.APPROVED,
    },
    { offering: "AI Tools", stage: S.OPEN, approval: A.NOT_REQUESTED },
  ],
};
// (3) "1 approved deal → Lost blocked" is covered by any won lead with a single
// approved deal (e.g. SCRIPT8021 Radiance) via the generic mapping.

function dealsForLead(lead) {
  const override = DEAL_SEED_OVERRIDES[lead.leadId];
  if (override) {
    return override.map((o, i) =>
      makeDeal(
        lead,
        OFFERING_ID_BY_NAME[o.offering] || "svc-custom-software",
        i,
        {
          stage: o.stage,
          approval: o.approval,
        }
      )
    );
  }
  const spec = LEGACY_TO_DEALSPEC[lead._legacyStatus];
  if (!spec) return [];
  const offeringId = committedOfferingIds(lead)[0];
  return [makeDeal(lead, offeringId, 0, spec)];
}

export const MOCK_DEALS = MOCK_LEADS.flatMap(dealsForLead);
