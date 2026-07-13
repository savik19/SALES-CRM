// ---------------------------------------------------------------------------
// Column definitions for the Lead Table — the single source for order,
// grouping, default visibility, sort behaviour and search inclusion.
// ---------------------------------------------------------------------------
// ORDER MATTERS: this array is the exact left-to-right order (identity →
// contact → location → status → ownership → commercial → dates → notes).
// The column-picker lists them in this same order. Do not reshuffle.
//
// Per column:
//   key            field on the lead (or "discountPct" for the computed one)
//   label          header text
//   group          logical group (used as section headers in the column-picker)
//   defaultVisible whether it shows before the user customises columns
//   sortType       how to compare when sorting (see LeadTable):
//                    text | number | date | status | priority | dsc | services
//                    | discount
//   searchable     included in the global search haystack
//   computed       true = derived on the fly, never stored (Discount %)
// ---------------------------------------------------------------------------

export const COLUMNS = [
  // — identity —
  {
    key: "leadId",
    label: "Lead Id",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
  },
  {
    key: "company",
    label: "Company",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
  },
  {
    key: "industry",
    label: "Industry",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
  },
  {
    key: "contactPerson",
    label: "Contact Person",
    group: "Identity",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
  },
  {
    key: "roleTitle",
    label: "Role / Title",
    group: "Identity",
    defaultVisible: false,
    sortType: "text",
  },

  // — contact —
  {
    key: "phone",
    label: "Phone",
    group: "Contact",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
  },
  {
    key: "email",
    label: "Email",
    group: "Contact",
    defaultVisible: false,
    sortType: "text",
    searchable: true,
  },

  // — location —
  {
    key: "city",
    label: "City",
    group: "Location",
    defaultVisible: true,
    sortType: "text",
    searchable: true,
  },
  {
    key: "country",
    label: "Country",
    group: "Location",
    defaultVisible: false,
    sortType: "text",
  },
  {
    key: "website",
    label: "Website",
    group: "Location",
    defaultVisible: false,
    sortType: "text",
  },
  {
    key: "linkedinUrl",
    label: "LinkedIn URL",
    group: "Location",
    defaultVisible: false,
    sortType: "text",
  },

  // — status / source —
  {
    key: "leadSource",
    label: "Lead Source",
    group: "Status",
    defaultVisible: false,
    sortType: "text",
  },
  {
    key: "leadStatus",
    label: "Lead Status",
    group: "Status",
    defaultVisible: true,
    sortType: "status",
  },
  {
    key: "priority",
    label: "Priority",
    group: "Status",
    defaultVisible: true,
    sortType: "priority",
  },

  // — ownership —
  {
    key: "assignedDscId",
    label: "Assigned DSC",
    group: "Ownership",
    defaultVisible: true,
    sortType: "dsc",
  },
  {
    key: "attemptCount",
    label: "Attempt Count",
    group: "Ownership",
    defaultVisible: false,
    sortType: "number",
  },

  // — commercial —
  {
    key: "servicesPitched",
    label: "Services Pitched",
    group: "Commercial",
    defaultVisible: false,
    sortType: "services",
  },
  {
    key: "servicesInterested",
    label: "Services Interested",
    group: "Commercial",
    defaultVisible: false,
    sortType: "services",
  },
  {
    key: "servicesOnboarded",
    label: "Services Onboarded",
    group: "Commercial",
    defaultVisible: false,
    sortType: "services",
  },
  {
    key: "quotedAmount",
    label: "Quoted Amount",
    group: "Commercial",
    defaultVisible: false,
    sortType: "number",
  },
  {
    key: "closedAmount",
    label: "Closed Amount",
    group: "Commercial",
    defaultVisible: false,
    sortType: "number",
  },
  {
    key: "discountPct",
    label: "Discount %",
    group: "Commercial",
    defaultVisible: false,
    sortType: "discount",
    computed: true,
  },
  {
    key: "lostReason",
    label: "Lost Reason",
    group: "Commercial",
    defaultVisible: false,
    sortType: "text",
  },

  // — dates —
  {
    key: "lastContactDate",
    label: "Last Contact Date",
    group: "Dates",
    defaultVisible: false,
    sortType: "date",
  },
  {
    key: "nextFollowUpDate",
    label: "Next Follow-up Date",
    group: "Dates",
    defaultVisible: true,
    sortType: "date",
  },

  // — notes —
  {
    key: "notes",
    label: "Notes",
    group: "Notes",
    defaultVisible: false,
    sortType: "text",
    searchable: true,
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

// Column groups in order (for the column-picker section headers).
export const COLUMN_GROUPS = COLUMNS.reduce((groups, col) => {
  const last = groups[groups.length - 1];
  if (last && last.name === col.group) last.columns.push(col);
  else groups.push({ name: col.group, columns: [col] });
  return groups;
}, []);
