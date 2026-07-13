// ---------------------------------------------------------------------------
// Excel import — pure helpers (no file I/O, no React). The BDM uploads an .xlsx
// containing the 17 import-sheet columns (see columns.js `IMPORT_SHEET_*`).
// The modal reads the file to rows and calls these; keeping them pure makes the
// validation/dedupe logic easy to test and reuse.
// ---------------------------------------------------------------------------

import {
  IMPORT_SHEET_COLUMNS,
  IMPORT_SHEET_HEADERS,
} from "@/components/leads/columns";

// Columns whose values should be coerced to ISO date strings.
const DATE_KEYS = new Set(["lastContactDate", "nextFollowUpDate"]);

// Coerce a raw cell (string | number | Date | null) to a trimmed string, and
// date cells to ISO "YYYY-MM-DD".
function coerce(key, cell) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(cell).trim();
  if (DATE_KEYS.has(key)) {
    // Accept already-ISO strings; leave others as-is for the BDM to eyeball.
    return s;
  }
  return s;
}

// Validate the sheet's header row against the expected 17.
// Returns { ok, missing, unexpected } — case/space-insensitive matching, but
// misnamed headers surface as both "missing" (expected not found) and
// "unexpected" (sheet header not recognised).
export function validateHeaders(headers) {
  const norm = (h) =>
    String(h ?? "")
      .trim()
      .toLowerCase();
  const present = headers.map(norm).filter(Boolean);
  const expected = IMPORT_SHEET_HEADERS.map(norm);

  const missing = IMPORT_SHEET_HEADERS.filter(
    (h) => !present.includes(norm(h))
  );
  const unexpected = headers.filter((h) => h && !expected.includes(norm(h)));
  return {
    ok: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
  };
}

// Build a lead object from one sheet row (17 fields) + CRM-only defaults.
// Business rule: every imported lead is Status = New, Assigned DSC = blank.
export function buildLeadFromRow(headers, row) {
  const idx = {};
  headers.forEach((h, i) => {
    idx[
      String(h ?? "")
        .trim()
        .toLowerCase()
    ] = i;
  });

  const lead = {};
  for (const col of IMPORT_SHEET_COLUMNS) {
    const i = idx[col.label.toLowerCase()];
    lead[col.key] = coerce(col.key, i === undefined ? "" : row[i]);
  }

  // Forced on import.
  lead.leadStatus = "New";
  lead.assignedDscId = "";

  // CRM-only defaults for the fields not in the sheet.
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
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Does `lead` duplicate any existing lead? Match on Phone OR Email OR
// (Company + City). Comparison is case-insensitive and handles multi-values.
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

// Classify parsed rows against the existing leads. Returns one entry per row:
//   { lead, status: "new" | "duplicate" | "error", reason }
// A row errors if it has nothing to identify it (no company AND no phone/email),
// or if its Lead Id collides with a row already seen in this batch.
export function classifyRows(leads, existing) {
  const seenIds = new Set();
  const accepted = []; // running list so within-batch dupes are caught too
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
