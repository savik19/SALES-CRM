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
 * @property {string} leadStatus        One of LEAD_STATUS (see lib/statuses). 7
 *                                      are manual; `in_discussion` and `won` are
 *                                      SERVER-DERIVED from the lead's deals (see
 *                                      lib/leadStatus) and never accepted on
 *                                      write; `lost` is manual but gated.
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
 * @property {string} stage          One of DEAL_STAGE (see lib/statuses): open,
 *                                   proposal_sent, negotiation, project_started
 *                                   (system, on approval), project_delivered
 *                                   (Admin), cancelled. INDEPENDENT of `approval`.
 * @property {string} approval       One of DEAL_APPROVAL: not_requested, pending,
 *                                   approved, rejected, reversed.
 * @property {number|null} quotedAmount  Rupees pitched, or null.
 * @property {number|null} finalAmount   Rupees finalized/agreed, or null. The
 *                                   commission base (never quotedAmount). Discount
 *                                   % is derived from quoted vs final, never stored.
 * @property {string} lostReason     One of LOST_REASONS; only when the deal is
 *                                   cancelled.
 * @property {string} createdDate    ISO "YYYY-MM-DD".
 * @property {Object|null} approvalRequest  Snapshot captured at request time.
 * @property {string} approvalReason Rejection / reversal reason, if any.
 * @property {string} wonApprovedDate  ISO date the Admin approved (stage →
 *                                   project_started, commission accrued).
 * @property {string} deliveredDate  ISO date the Admin set project_delivered
 *                                   (commission released), or "".
 * @property {string} approvalDecidedBy   Admin id who decided.
 * @property {string} approvalDecidedDate ISO date of the decision.
 * @property {string} paymentStatus  "Pending" | "Partial" | "Paid".
 * @property {number} receivedAmount Rupees received so far.
 * @property {string} notes          Free-form text.
 */

/**
 * A catalog Offering — the thing a Deal sells; its rule prices the commission.
 * @typedef {Object} Offering
 * @property {string} id
 * @property {string} name              e.g. "Website Development".
 * @property {'service'|'product'} kind
 * @property {{type:'fixed'|'percent',value:number}} dsc  What the closing DSC earns.
 * @property {{type:'fixed'|'percent',value:number}} bdm  The BDM manager override.
 * @property {boolean} active           Inactive offerings can't start a NEW deal.
 */

/**
 * A commission ledger entry (append-only). See lib/commissionLedger.
 * @typedef {Object} CommissionEntry
 * @property {string} id
 * @property {string} dealId
 * @property {string} leadId
 * @property {string} userId        Deal owner at the time of the event.
 * @property {'accrual'|'release'|'reversal'} type
 * @property {number} amount        Signed: reversal is negative.
 * @property {number} basisAmount   The finalAmount used.
 * @property {string} offeringId
 * @property {string} ruleSnapshot  JSON of the comp rule AT THAT MOMENT.
 * @property {string} createdAt
 * @property {string} createdBy
 * @property {string} [reason]
 */

/**
 * An audit-trail entry. See lib/audit.
 * @typedef {Object} AuditEntry
 * @property {string} id
 * @property {'lead'|'deal'} entityType
 * @property {string} entityId
 * @property {string} field
 * @property {*} from
 * @property {*} to
 * @property {string} userId
 * @property {string} role
 * @property {string} at
 * @property {string} [reason]
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
