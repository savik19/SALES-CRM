// ---------------------------------------------------------------------------
// Team members (DSCs + BDM/Manager)
// ---------------------------------------------------------------------------
// MOCK DATA — replace with the real users API later (Brief §4 roles).
//
// Roles:
//   - "dsc" : Digital Solution Consultant (front-line sales, sees own leads)
//   - "bdm" : BDM / Manager (sees the whole team)
//
// `id` is what a lead's `assignedDscId` points at.
// ---------------------------------------------------------------------------

export const TEAM = [
  { id: "u-anaya", name: "Anaya Rao", role: "dsc", initials: "AR" },
  { id: "u-kabir", name: "Kabir Mehta", role: "dsc", initials: "KM" },
  { id: "u-isha", name: "Isha Verma", role: "dsc", initials: "IV" },
  { id: "u-rohan", name: "Rohan Nair", role: "dsc", initials: "RN" },
  { id: "u-prakhar", name: "Prakhar (BDM)", role: "bdm", initials: "PB" },
];

// Lookup by id -> user object.
export const USER_BY_ID = TEAM.reduce((acc, u) => {
  acc[u.id] = u;
  return acc;
}, {});

// Just the DSCs (handy for the "Assigned DSC" filter and reassignment UI).
export const DSCS = TEAM.filter((u) => u.role === "dsc");

// Display helper — returns a friendly name for an assignedDscId.
export function dscName(id) {
  return USER_BY_ID[id]?.name || "Unassigned";
}
