// ===========================================================================
//  SHARED DATA CONTRACT (JSDoc typedefs)
// ===========================================================================
//  The shapes that flow between the frontend and the future Laravel API — the
//  single reference both teams code against. JSDoc (not TypeScript) so you get
//  editor autocomplete without a build step. See docs/API_CONTRACT.md for the
//  endpoint-by-endpoint details, and src/data/mockLeads.js for the option lists.
// ===========================================================================

/**
 * A sales lead — the full 26-field schema (column order preserved).
 * "Discount %" (column 22) is NOT here: it is computed from quoted/closed
 * amounts on the fly and never stored (see src/lib/format.js `discountPct`).
 *
 * @typedef {Object} Lead
 * @property {string} leadId            Primary key, e.g. "SCRIPT8073".
 * @property {string} company           Company name.
 * @property {string} industry          One of INDUSTRIES.
 * @property {string} contactPerson     May be "" (missing on scraped leads).
 * @property {string} roleTitle         Role / title; may be "".
 * @property {string} phone             Text — may hold several, comma-separated.
 *                                      NEVER a number type.
 * @property {string} email             Text — may hold several, comma-separated;
 *                                      may be "".
 * @property {string} city              City.
 * @property {string} country           Defaults to "India".
 * @property {string} website           URL; may be "".
 * @property {string} linkedinUrl       URL; may be "".
 * @property {string} leadSource        One of LEAD_SOURCES.
 * @property {string} leadStatus        One of LEAD_STATUSES (pipeline order).
 * @property {string} priority          One of PRIORITIES.
 * @property {string} assignedDscId     Owning DSC id (see TeamMember.id).
 * @property {number} attemptCount      Contact attempts.
 * @property {string[]} servicesPitched     Subset of SERVICES (knowledge tag).
 * @property {string[]} servicesInterested  Subset of SERVICES (knowledge tag);
 *                                          drives which offerings a Deal can be
 *                                          created for.
 * @property {string[]} servicesOnboarded   Subset of SERVICES (knowledge tag).
 * @property {string} lastContactDate   ISO "YYYY-MM-DD" or "".
 * @property {string} nextFollowUpDate  ISO "YYYY-MM-DD" or "".
 * @property {string} notes             Free-form long text.
 */

/**
 * A Deal — ONE confirmed offering (a single service or product) under a Lead
 * (Lead → Deal model). Money, status, approval, commission and target all live
 * here. A lead can hold many deals, now and in future.
 *
 * @typedef {Object} Deal
 * @property {string} dealId         Primary key, e.g. "DEAL-8008-1".
 * @property {string} leadId         Parent Lead (FK → Lead.leadId).
 * @property {string} companyId      Denormalized company grouping.
 * @property {string} offeringId     The single catalog offering sold (FK). Its
 *                                   compensation rule prices this deal.
 * @property {string} ownerId        Owning DSC (FK → TeamMember.id).
 * @property {string} dealStatus     One of DEAL_STATUSES (the pipeline stage).
 * @property {number|null} quotedAmount  Rupees pitched, or null.
 * @property {number|null} closedAmount  Rupees finalized/agreed, or null.
 * @property {string} lostReason     One of LOST_REASONS; only when dealStatus
 *                                   is "Lost". Discount % is derived from
 *                                   quoted/closed, never stored.
 * @property {string} createdDate    ISO "YYYY-MM-DD".
 * @property {string} approvalStatus "" | "pending" | "approved" | "rejected".
 * @property {Object|null} approvalRequest  Snapshot sent for approval.
 * @property {string} approvalReason Rejection reason, if any.
 * @property {string} wonApprovedDate ISO date the Admin approved the win; only
 *                                    deals with this set count as won.
 * @property {string} approvalDecidedBy   Admin id who decided.
 * @property {string} approvalDecidedDate ISO date of the decision.
 * @property {string} paymentStatus  "Pending" | "Partial" | "Paid".
 * @property {number} receivedAmount Rupees received so far.
 * @property {string} notes          Free-form text.
 */

/**
 * A DSC (sales consultant) referenced by a lead's `assignedDscId`.
 *
 * @typedef {Object} TeamMember
 * @property {string} id        Primary key, e.g. "u-anaya".
 * @property {string} name      Display name.
 * @property {string} initials  Two-letter avatar initials.
 */

// This file intentionally exports nothing — it exists purely for the typedefs.
export {};
