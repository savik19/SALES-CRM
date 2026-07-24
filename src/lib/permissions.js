// ---------------------------------------------------------------------------
// Permissions — the SINGLE place that answers "may this user do X?". Pure, no
// React. Components and the data layer both call `can(user, action, resource)`
// instead of scattering `role === "admin"` checks around the codebase.
//
// Roles: "dsc" | "bdm" | "admin".
//   - DSC  acts on their OWN leads/deals only.
//   - BDM  acts on the whole TEAM (this is a single-team CRM, so team = all),
//          BUT cannot approve — approval is the money control and the BDM is
//          compensated on team sales, so approving their own team's deals is a
//          conflict of interest. The BDM sees the pending queue read-only.
//   - Admin can do everything, including the approval / deliver / reverse actions.
//
// `resource` (optional) is the lead or deal being acted on; only its `ownerId`
// / `assignedDscId` matters here. Pass null for screen-level actions.
// ---------------------------------------------------------------------------

export const ROLES = { DSC: "dsc", BDM: "bdm", ADMIN: "admin" };

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}
export function isManager(user) {
  // "Manager" = can see/act across the team (BDM or Admin).
  return user?.role === ROLES.BDM || user?.role === ROLES.ADMIN;
}

// Actions only the Admin may perform (the money controls + admin-only screens).
const ADMIN_ONLY = new Set([
  "approve_deal",
  "reject_deal",
  "set_delivered",
  "reverse_deal",
  "column_mapping",
  "compensation_edit",
]);

// Actions the BDM and Admin share (not the DSC).
const MANAGER_UP = new Set(["import_excel", "bulk_assign"]);

// Ownership-scoped actions: DSC only on own, BDM/Admin on any.
const OWNERSHIP_SCOPED = new Set([
  "edit_lead_status",
  "set_lead_lost",
  "create_deal",
  "edit_deal_stage",
  "edit_deal_amounts",
  "request_approval",
]);

// The owning user id of a resource (deal.ownerId or lead.assignedDscId).
function ownerOf(resource) {
  if (!resource) return undefined;
  return resource.ownerId ?? resource.assignedDscId;
}

/**
 * The core check. Returns a boolean.
 * @param {{id:string, role:string}} user
 * @param {string} action
 * @param {object|null} [resource]
 */
export function can(user, action, resource = null) {
  const role = user?.role;
  if (!role) return false;
  if (role === ROLES.ADMIN) return true; // Admin can do everything.

  if (ADMIN_ONLY.has(action)) return false; // BDM + DSC blocked from money controls.

  if (MANAGER_UP.has(action)) return role === ROLES.BDM;

  // Read the pending approvals queue (read-only for the BDM so they can chase it).
  if (action === "view_approvals") return role === ROLES.BDM;

  // Compensation screen is read-only for the BDM (team), hidden from the DSC.
  if (action === "compensation_view") return role === ROLES.BDM;

  if (action === "see_own_commission") return true;
  if (action === "see_others_commission") return role === ROLES.BDM;

  if (OWNERSHIP_SCOPED.has(action)) {
    if (role === ROLES.BDM) return true; // whole team
    // DSC: own resource only (or an as-yet unassigned one they're picking up).
    const owner = ownerOf(resource);
    return owner === undefined || owner === "" || owner === user.id;
  }

  // Unknown action → deny by default.
  return false;
}

// Convenience wrapper the Approvals screen uses.
export function canApprove(user) {
  return isAdmin(user);
}

// The row-scope a user sees by default: "own" (DSC) or "all" (BDM/Admin).
export function visibilityScope(user) {
  return isManager(user) ? "all" : "own";
}
