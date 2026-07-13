// ---------------------------------------------------------------------------
// Column definitions for the Lead Table — the single source for order,
// grouping, default visibility, sort behaviour, search inclusion, whether the
// field comes from the Excel import sheet, and default width.
// ---------------------------------------------------------------------------
// ORDER MATTERS: this array is the exact left-to-right order. The column-picker
// and the Excel-import validation both derive from it. Do not reshuffle.
//
// Per column:
//   key            field on the lead (or "discountPct" for the computed one)
//   label          header text (also the exact header expected in the import sheet)
//   group          logical group (section headers in the picker / expanded row)
//   defaultVisible whether it shows before the user customises columns
//   sortType       text | number | date | status | priority | dsc | services | discount
//   searchable     included in the global search haystack
//   inImportSheet  true = present in the scraped Excel sheet (columns 1–17);
//                  false = CRM-only, filled in by the team later (columns 18–26)
//   computed       true = derived on the fly, never stored (Discount %)
//   width          default column width in px (user can drag to resize)
// ---------------------------------------------------------------------------

export const COLUMNS = [
  // 1–17 — present in the import sheet
  {
    key: "leadId",
    label: "Lead Id",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
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
    width: 190,
  },
  {
    key: "industry",
    label: "Industry",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    inImportSheet: true,
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
    width: 160,
  },
  {
    key: "roleTitle",
    label: "Role / Title",
    group: "Identity",
    defaultVisible: false,
    sortType: "text",
    inImportSheet: true,
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
    width: 170,
  },
  {
    key: "email",
    label: "Email",
    group: "Contact",
    defaultVisible: false,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
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
    width: 120,
  },
  {
    key: "country",
    label: "Country",
    group: "Location",
    defaultVisible: false,
    sortType: "text",
    inImportSheet: true,
    width: 110,
  },
  {
    key: "website",
    label: "Website",
    group: "Location",
    defaultVisible: false,
    sortType: "text",
    inImportSheet: true,
    width: 170,
  },
  {
    key: "linkedinUrl",
    label: "LinkedIn URL",
    group: "Location",
    defaultVisible: false,
    sortType: "text",
    inImportSheet: true,
    width: 170,
  },
  {
    key: "leadSource",
    label: "Lead Source",
    group: "Status",
    defaultVisible: false,
    sortType: "text",
    inImportSheet: true,
    width: 130,
  },
  {
    key: "leadStatus",
    label: "Lead Status",
    group: "Status",
    defaultVisible: true,
    sortType: "status",
    inImportSheet: true,
    width: 150,
  },
  {
    key: "priority",
    label: "Priority",
    group: "Status",
    defaultVisible: true,
    sortType: "priority",
    inImportSheet: true,
    width: 110,
  },
  {
    key: "lastContactDate",
    label: "Last Contact Date",
    group: "Dates",
    defaultVisible: false,
    sortType: "date",
    inImportSheet: true,
    width: 150,
  },
  {
    key: "nextFollowUpDate",
    label: "Next Follow-up Date",
    group: "Dates",
    defaultVisible: true,
    sortType: "date",
    inImportSheet: true,
    width: 160,
  },
  {
    key: "notes",
    label: "Notes",
    group: "Notes",
    defaultVisible: false,
    sortType: "text",
    searchable: true,
    inImportSheet: true,
    width: 240,
  },

  // 18–26 — CRM-only fields (not in the import sheet)
  {
    key: "assignedDscId",
    label: "Assigned DSC",
    group: "Ownership",
    defaultVisible: true,
    sortType: "dsc",
    inImportSheet: false,
    width: 150,
  },
  {
    key: "attemptCount",
    label: "Attempt Count",
    group: "Ownership",
    defaultVisible: false,
    sortType: "number",
    inImportSheet: false,
    width: 120,
  },
  {
    key: "servicesPitched",
    label: "Services Pitched",
    group: "Commercial",
    defaultVisible: false,
    sortType: "services",
    inImportSheet: false,
    width: 190,
  },
  {
    key: "servicesInterested",
    label: "Services Interested",
    group: "Commercial",
    defaultVisible: false,
    sortType: "services",
    inImportSheet: false,
    width: 190,
  },
  {
    key: "servicesOnboarded",
    label: "Services Onboarded",
    group: "Commercial",
    defaultVisible: false,
    sortType: "services",
    inImportSheet: false,
    width: 190,
  },
  {
    key: "quotedAmount",
    label: "Quoted Amount",
    group: "Commercial",
    defaultVisible: false,
    sortType: "number",
    inImportSheet: false,
    width: 140,
  },
  {
    key: "closedAmount",
    label: "Closed Amount",
    group: "Commercial",
    defaultVisible: false,
    sortType: "number",
    inImportSheet: false,
    width: 140,
  },
  {
    key: "discountPct",
    label: "Discount %",
    group: "Commercial",
    defaultVisible: false,
    sortType: "discount",
    inImportSheet: false,
    computed: true,
    width: 110,
  },
  {
    key: "lostReason",
    label: "Lost Reason",
    group: "Commercial",
    defaultVisible: false,
    sortType: "text",
    inImportSheet: false,
    width: 170,
  },
];

// Keys shown by default (the 10 marked "Yes").
export const DEFAULT_VISIBLE_KEYS = COLUMNS.filter((c) => c.defaultVisible).map(
  (c) => c.key
);

// Keys included in the global search haystack.
export const SEARCHABLE_KEYS = COLUMNS.filter((c) => c.searchable).map(
  (c) => c.key
);

// The 17 headers expected in the scraped Excel import sheet, in order.
export const IMPORT_SHEET_COLUMNS = COLUMNS.filter((c) => c.inImportSheet);
export const IMPORT_SHEET_HEADERS = IMPORT_SHEET_COLUMNS.map((c) => c.label);

// Column groups in order (section headers in the picker + expanded row).
export const COLUMN_GROUPS = COLUMNS.reduce((groups, col) => {
  const last = groups[groups.length - 1];
  if (last && last.name === col.group) last.columns.push(col);
  else groups.push({ name: col.group, columns: [col] });
  return groups;
}, []);

// Lookup by key.
export const COLUMN_BY_KEY = COLUMNS.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {});
