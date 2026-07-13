// ---------------------------------------------------------------------------
// Excel import — pure helpers (no file I/O, no React). The BDM uploads an .xlsx
// containing (at least) the 17 import-sheet columns (columns.js `IMPORT_SHEET_*`).
// The modal reads the file to rows and calls these; keeping them pure makes the
// validation/dedupe logic easy to test and reuse.
//
// Real scraped sheets are messy: headers vary in case/spacing/punctuation, use
// common synonyms ("Phone Number", "Lead ID"), and often carry EXTRA columns.
// So matching is tolerant: normalise + alias, allow extra columns (reported as a
// non-blocking warning), and only block when a REQUIRED column is missing.
// ---------------------------------------------------------------------------

import {
  IMPORT_SHEET_COLUMNS,
  IMPORT_SHEET_HEADERS,
} from "@/components/leads/columns";

const DATE_KEYS = new Set(["lastContactDate", "nextFollowUpDate"]);

// Normalise a header: lowercase, punctuation → spaces, collapse spaces, trim.
// "Role / Title" → "role title", "LinkedIn URL" → "linkedin url".
function norm(h) {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Common header synonyms → the normalised canonical header they map to.
const ALIASES = {
  lead: "lead id",
  id: "lead id",
  "company name": "company",
  organisation: "company",
  organization: "company",
  contact: "contact person",
  "contact name": "contact person",
  name: "contact person",
  role: "role title",
  title: "role title",
  designation: "role title",
  "phone number": "phone",
  "phone no": "phone",
  "contact number": "phone",
  mobile: "phone",
  "mobile number": "phone",
  "email id": "email",
  "email address": "email",
  "e mail": "email",
  location: "city",
  town: "city",
  web: "website",
  "website url": "website",
  linkedin: "linkedin url",
  "linkedin profile": "linkedin url",
  "linkedin link": "linkedin url",
  source: "lead source",
  status: "lead status",
  "last contact": "last contact date",
  "last contacted": "last contact date",
  "last contacted date": "last contact date",
  "next follow up": "next follow up date",
  "follow up date": "next follow up date",
  "next fup date": "next follow up date",
  remarks: "notes",
  note: "notes",
  comments: "notes",
};

// Canonicalise a raw header to a normalised canonical form (applies aliases).
function canon(h) {
  const n = norm(h);
  return ALIASES[n] || n;
}

// Validate the sheet's headers against the 17 required columns.
// Returns:
//   ok          – true when no REQUIRED column is missing
//   missing     – required column labels not found (blocking)
//   unexpected  – sheet headers not recognised (non-blocking warning, ignored)
//   indexByKey  – { columnKey -> sheet column index } for the matched columns
export function validateHeaders(headers) {
  const canonHeaders = headers.map(canon);
  const indexByKey = {};
  const missing = [];

  for (const col of IMPORT_SHEET_COLUMNS) {
    const target = norm(col.label);
    const i = canonHeaders.findIndex((h) => h === target);
    if (i === -1) missing.push(col.label);
    else indexByKey[col.key] = i;
  }

  const expectedSet = new Set(IMPORT_SHEET_HEADERS.map(norm));
  const unexpected = headers.filter((h, i) => {
    if (!String(h ?? "").trim()) return false;
    // A header is "unexpected" only if it maps to nothing we know AND isn't a
    // matched column.
    const matched = Object.values(indexByKey).includes(i);
    return !matched && !expectedSet.has(canon(h));
  });

  return { ok: missing.length === 0, missing, unexpected, indexByKey };
}

// Coerce a raw cell to a trimmed string; dates → ISO "YYYY-MM-DD".
function coerce(key, cell) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(cell).trim();
  return DATE_KEYS.has(key) ? s : s;
}

// Build a lead object from one sheet row using the matched column index map.
// Business rule: every imported lead is Status = New, Assigned DSC = blank.
export function buildLeadFromRow(indexByKey, row) {
  const lead = {};
  for (const col of IMPORT_SHEET_COLUMNS) {
    const i = indexByKey[col.key];
    lead[col.key] = coerce(col.key, i === undefined ? "" : row[i]);
  }
  lead.leadStatus = "New";
  lead.assignedDscId = "";
  lead.attemptCount = 0;
  lead.servicesPitched = [];
  lead.servicesInterested = [];
  lead.servicesOnboarded = [];
  lead.quotedAmount = null;
  lead.closedAmount = null;
  lead.lostReason = "";
  return lead;
}

// Split a phone/email cell that may hold several comma-separated values.
function parts(value) {
  return String(value || "")
    .split(/[,;/]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Does `lead` duplicate any existing lead? Match on Phone OR Email OR
// (Company + City). Case-insensitive; handles multi-value phone/email.
export function isDuplicate(lead, existing) {
  const phones = parts(lead.phone);
  const emails = parts(lead.email);
  const company = (lead.company || "").trim().toLowerCase();
  const city = (lead.city || "").trim().toLowerCase();

  return existing.some((e) => {
    const ePhones = parts(e.phone);
    const eEmails = parts(e.email);
    if (phones.length && ePhones.some((p) => phones.includes(p))) return true;
    if (emails.length && eEmails.some((m) => emails.includes(m))) return true;
    if (
      company &&
      city &&
      (e.company || "").trim().toLowerCase() === company &&
      (e.city || "").trim().toLowerCase() === city
    ) {
      return true;
    }
    return false;
  });
}

// Classify parsed rows against the existing leads. One entry per row:
//   { lead, status: "new" | "duplicate" | "error", reason }
export function classifyRows(leads, existing) {
  const seenIds = new Set();
  const accepted = [];
  return leads.map((lead) => {
    if (!lead.company && !lead.phone && !lead.email) {
      return { lead, status: "error", reason: "No company, phone, or email" };
    }
    if (lead.leadId && seenIds.has(lead.leadId.toLowerCase())) {
      return {
        lead,
        status: "error",
        reason: `Duplicate Lead Id in file (${lead.leadId})`,
      };
    }
    if (lead.leadId) seenIds.add(lead.leadId.toLowerCase());

    if (isDuplicate(lead, existing) || isDuplicate(lead, accepted)) {
      return { lead, status: "duplicate", reason: "Matches an existing lead" };
    }
    accepted.push(lead);
    return { lead, status: "new", reason: "" };
  });
}

// Is a parsed row entirely empty? (skip blank trailing rows from the sheet)
export function isBlankRow(row) {
  return !row || row.every((c) => String(c ?? "").trim() === "");
}
