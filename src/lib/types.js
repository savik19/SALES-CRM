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
 * @property {string[]} servicesPitched     Subset of SERVICES.
 * @property {string[]} servicesInterested  Subset of SERVICES.
 * @property {string[]} servicesOnboarded   Subset of SERVICES.
 * @property {number|null} quotedAmount  Rupees, or null.
 * @property {number|null} closedAmount  Rupees, or null.
 * @property {string} lostReason        One of LOST_REASONS; only when Lost.
 * @property {string} lastContactDate   ISO "YYYY-MM-DD" or "".
 * @property {string} nextFollowUpDate  ISO "YYYY-MM-DD" or "".
 * @property {string} notes             Free-form long text.
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
