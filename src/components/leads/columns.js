// ---------------------------------------------------------------------------
// DEFAULT column definitions for the Lead Table.
// ---------------------------------------------------------------------------
// This is the SEED for the editable column config (see src/lib/columnConfig).
// The BDM can rename a column, edit which sheet headers map to it (aliases),
// toggle whether it comes from the import sheet, or add/remove columns — all at
// runtime via the Column Mapping screen. This array is what those edits start
// from and what "Reset to defaults" restores.
//
// Per column:
//   key            STABLE id (the lead field name) — never changes, even when
//                  the display label is renamed. This is the "column ID" edits
//                  are keyed on.
//   label          display name (editable)
//   group          section grouping
//   defaultVisible seed for visibility (the table now shows ALL columns by
//                  default; this is kept for reference/Reset)
//   sortType       text | number | date | status | priority | dsc | services | discount
//   searchable     included in global search
//   inImportSheet  present in the scraped .xlsx (editable)
//   aliases        other sheet header names that map to this column (editable) —
//                  matching is case/space/punctuation-insensitive
//   computed       derived, never stored (Discount %)
//   width          default width in px (user can drag to resize)
// ---------------------------------------------------------------------------

export const COLUMNS = [
  {
    key: "leadId",
    label: "Lead Id",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    aliases: ["Lead ID", "LeadID", "ID"],
    width: 120,
  },
  {
    key: "company",
    label: "Company",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    aliases: ["Company Name", "Organisation", "Organization"],
    width: 190,
  },
  {
    key: "industry",
    label: "Industry",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: true,
    aliases: ["Sector"],
    width: 160,
  },
  {
    key: "contactPerson",
    label: "Contact Person",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    aliases: ["Contact Name", "Contact", "Name"],
    width: 160,
  },
  {
    key: "roleTitle",
    label: "Role / Title",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: true,
    aliases: ["Designation", "Role", "Title"],
    width: 150,
  },
  {
    key: "phone",
    label: "Phone",
    group: "Contact",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    aliases: [
      "Phone Number",
      "Phone No",
      "Contact Number",
      "Mobile",
      "Mobile Number",
    ],
    width: 170,
  },
  {
    key: "email",
    label: "Email",
    group: "Contact",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    aliases: ["Email ID", "Email Address", "E-mail"],
    width: 190,
  },
  {
    key: "city",
    label: "City",
    group: "Location",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    aliases: ["Location", "Town"],
    width: 120,
  },
  {
    key: "country",
    label: "Country",
    group: "Location",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: true,
    aliases: [],
    width: 110,
  },
  {
    key: "website",
    label: "Website",
    group: "Location",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: true,
    aliases: ["Website URL", "Web"],
    width: 170,
  },
  {
    key: "linkedinUrl",
    label: "LinkedIn URL",
    group: "Location",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: true,
    aliases: ["LinkedIn", "LinkedIn Profile", "LinkedIn Link"],
    width: 170,
  },
  {
    key: "leadSource",
    label: "Lead Source",
    group: "Status",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: true,
    aliases: ["Source"],
    width: 130,
  },
  {
    key: "leadStatus",
    label: "Lead Status",
    group: "Status",
    defaultVisible: true,
    sortType: "status",
    inImportSheet: true,
    aliases: ["Status"],
    width: 150,
  },
  {
    key: "priority",
    label: "Priority",
    group: "Status",
    defaultVisible: true,
    sortType: "priority",
    inImportSheet: true,
    aliases: [],
    width: 110,
  },
  {
    key: "lastContactDate",
    label: "Last Contact Date",
    group: "Dates",
    defaultVisible: true,
    sortType: "date",
    inImportSheet: true,
    aliases: ["Last Contact", "Last Contacted", "Last Contacted Date"],
    width: 150,
  },
  {
    key: "nextFollowUpDate",
    label: "Next Follow-up Date",
    group: "Dates",
    defaultVisible: true,
    sortType: "date",
    inImportSheet: true,
    aliases: ["Next Follow Up", "Follow Up Date", "Next FUP Date"],
    width: 160,
  },
  {
    key: "notes",
    label: "Notes",
    group: "Notes",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    aliases: ["Remarks", "Note", "Comments"],
    width: 240,
  },

  // CRM-only fields (not in the import sheet)
  {
    key: "assignedDscId",
    label: "Assigned DSC",
    group: "Ownership",
    defaultVisible: true,
    sortType: "dsc",
    inImportSheet: false,
    aliases: [],
    width: 150,
  },
  {
    key: "attemptCount",
    label: "Attempt Count",
    group: "Ownership",
    defaultVisible: true,
    sortType: "number",
    inImportSheet: false,
    aliases: [],
    width: 120,
  },
  {
    key: "servicesPitched",
    label: "Services Pitched",
    group: "Commercial",
    defaultVisible: true,
    sortType: "services",
    inImportSheet: false,
    aliases: [],
    width: 190,
  },
  {
    key: "servicesInterested",
    label: "Services Interested",
    group: "Commercial",
    defaultVisible: true,
    sortType: "services",
    inImportSheet: false,
    aliases: [],
    width: 190,
  },
  {
    key: "servicesOnboarded",
    label: "Services Onboarded",
    group: "Commercial",
    defaultVisible: true,
    sortType: "services",
    inImportSheet: false,
    aliases: [],
    width: 190,
  },
  {
    key: "quotedAmount",
    label: "Quoted Amount",
    group: "Commercial",
    defaultVisible: true,
    sortType: "number",
    inImportSheet: false,
    aliases: [],
    width: 140,
  },
  {
    key: "closedAmount",
    label: "Closed Amount",
    group: "Commercial",
    defaultVisible: true,
    sortType: "number",
    inImportSheet: false,
    aliases: [],
    width: 140,
  },
  {
    key: "discountPct",
    label: "Discount %",
    group: "Commercial",
    defaultVisible: true,
    sortType: "discount",
    inImportSheet: false,
    computed: true,
    aliases: [],
    width: 110,
  },
  {
    key: "lostReason",
    label: "Lost Reason",
    group: "Commercial",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: false,
    aliases: [],
    width: 170,
  },
];

// ---- Pure selectors over a columns array (works for the live/edited config) -

export function visibleDefaults(columns) {
  return columns.filter((c) => c.defaultVisible).map((c) => c.key);
}
export function allKeys(columns) {
  return columns.map((c) => c.key);
}
export function searchableKeys(columns) {
  return columns.filter((c) => c.searchable).map((c) => c.key);
}
export function importColumns(columns) {
  return columns.filter((c) => c.inImportSheet);
}
export function groupsOf(columns) {
  return columns.reduce((groups, col) => {
    const last = groups[groups.length - 1];
    if (last && last.name === col.group) last.columns.push(col);
    else groups.push({ name: col.group, columns: [col] });
    return groups;
  }, []);
}
export function byKey(columns) {
  return columns.reduce((acc, c) => {
    acc[c.key] = c;
    return acc;
  }, {});
}
