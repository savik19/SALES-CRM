// ===========================================================================
//  SHARED DATA CONTRACT (JSDoc typedefs)
// ===========================================================================
//  This file defines the shapes that flow between the frontend and the future
//  Laravel API. It is the single reference both teams code against.
//
//  These are JSDoc @typedefs (not TypeScript) so they add editor autocomplete
//  and inline docs without a build step. Import them for hints like:
//
//      /** @param {import('@/lib/types').Lead} lead */
//
//  When the API is built, these shapes ARE the contract — keep the JSON your
//  endpoints return matching the fields below. See docs/API_CONTRACT.md for the
//  endpoint-by-endpoint details.
// ===========================================================================

/**
 * A sales lead. Mirrors the master-sheet columns (Build Brief §5) plus the two
 * CRM-only fields the sheet lacks: `assignedDscId` and `source`.
 *
 * @typedef {Object} Lead
 * @property {string} id             Primary key (e.g. "L-1001").
 * @property {string} company        Prospect company name.
 * @property {string} industry       e.g. "Real Estate", "Dental".
 * @property {string} website        URL; may be "" / "N/A".
 * @property {string} contactPerson  May be "".
 * @property {string} designation    e.g. "Owner", "Director".
 * @property {string} phone          Free text (formatting varies).
 * @property {string} email          Often "-" when missing.
 * @property {string} location       City.
 * @property {LeadStatusKey} status  Pipeline status key (see statuses.js).
 * @property {string} budget         Free text ("200K", "Yet to confirm").
 * @property {string} remarks        Free-form follow-up notes.
 * @property {string} lastFollowUp   ISO date "YYYY-MM-DD" or "".
 * @property {string} nextFollowUp   ISO date "YYYY-MM-DD" or "".
 * @property {string} assignedDscId  Owning DSC id (see TeamMember.id).
 * @property {string} source         Lead source ("LinkedIn", "Cold Call"…).
 */

/**
 * A member of the sales team.
 *
 * @typedef {Object} TeamMember
 * @property {string} id        Primary key (e.g. "u-anaya").
 * @property {string} name      Display name.
 * @property {"dsc"|"bdm"} role "dsc" = front-line; "bdm" = manager.
 * @property {string} initials  Two-letter avatar initials.
 */

/**
 * A status in the lead pipeline (Build Brief §6).
 *
 * @typedef {"new"|"first_call_pending"|"in_progress"|"follow_up"|
 *   "demo_proposal"|"on_hold"|"won"|"dropped"|"not_connecting"} LeadStatusKey
 *
 * @typedef {Object} LeadStatus
 * @property {LeadStatusKey} key      Stable machine value stored on a lead.
 * @property {string} label           Human label for the UI.
 * @property {"pipeline"|"special"} type  Funnel stage vs non-pipeline state.
 * @property {string} badge           Tailwind classes for the colour-coded pill.
 */

/**
 * A DSC's daily activity metrics (Build Brief §7). Used by the KPI/Analytics
 * screens once built. One record per DSC per day.
 *
 * @typedef {Object} KpiEntry
 * @property {string} dscId               Which DSC (TeamMember.id).
 * @property {string} date                ISO date "YYYY-MM-DD".
 * @property {number} callsMade
 * @property {number} connectedCalls
 * @property {number} callBacks
 * @property {number} callsNotConnected
 * @property {number} linkedinConnectsSent
 * @property {number} linkedinMessagesSent
 */

// This file intentionally exports nothing — it exists purely for the typedefs.
export {};
