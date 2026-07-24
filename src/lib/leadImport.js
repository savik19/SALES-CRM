// ---------------------------------------------------------------------------
// Excel import — pure helpers (no file I/O, no React). The BDM uploads an .xlsx
// containing (at least) the import-sheet columns. Which columns are expected —
// and which sheet-header names map to each — comes from the editable column
// config (see src/lib/columnConfig), passed in as `importCols`.
//
// Matching is tolerant: a sheet header matches a column if, after normalising
// (lowercase, punctuation→space, collapse spaces), it equals the column's label
// OR any of its configured aliases. Extra columns are ignored (reported as a
// warning). Only a genuinely missing REQUIRED column blocks the import.
// ---------------------------------------------------------------------------

const DATE_KEYS = new Set(["lastContactDate", "nextFollowUpDate"]);

export function normHeader(h) {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// The set of normalised header names that map to a given column.
function targetsFor(col) {
  return new Set([
    normHeader(col.label),
    ...(col.aliases || []).map(normHeader),
  ]);
}

// Validate the sheet's headers against the configured import columns.
// Returns { ok, missing, unexpected, indexByKey }.
export function validateHeaders(headers, importCols) {
  const normed = headers.map(normHeader);
  const indexByKey = {};
  const missing = [];
  const matchedIdx = new Set();

  for (const col of importCols) {
    const targets = targetsFor(col);
    const i = normed.findIndex(
      (h, idx) => targets.has(h) && !matchedIdx.has(idx)
    );
    if (i === -1) missing.push(col.label);
    else {
      indexByKey[col.key] = i;
      matchedIdx.add(i);
    }
  }

  const unexpected = headers.filter(
    (h, i) => String(h ?? "").trim() && !matchedIdx.has(i)
  );

  return { ok: missing.length === 0, missing, unexpected, indexByKey };
}

function coerce(key, cell) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(cell).trim();
}

// Build a lead object from one sheet row using the matched column index map.
// Business rule: every imported lead is Status = New, Assigned DSC = blank.
export function buildLeadFromRow(importCols, indexByKey, row) {
  const lead = {};
  for (const col of importCols) {
    const i = indexByKey[col.key];
    lead[col.key] = coerce(col.key, i === undefined ? "" : row[i]);
  }
  lead.leadStatus = "new";
  lead.assignedDscId = "";
  lead.attemptCount = 0;
  lead.servicesPitched = [];
  lead.servicesInterested = [];
  lead.servicesOnboarded = [];
  // No money on the lead — quoted/closed/discount/lost-reason live on the Deal.
  return lead;
}

function parts(value) {
  return String(value || "")
    .split(/[,;/]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Duplicate if Phone OR Email OR (Company + City) match an existing lead.
export function isDuplicate(lead, existing) {
  const phones = parts(lead.phone);
  const emails = parts(lead.email);
  const company = (lead.company || "").trim().toLowerCase();
  const city = (lead.city || "").trim().toLowerCase();

  return existing.some((e) => {
    if (phones.length && parts(e.phone).some((p) => phones.includes(p)))
      return true;
    if (emails.length && parts(e.email).some((m) => emails.includes(m)))
      return true;
    if (
      company &&
      city &&
      (e.company || "").trim().toLowerCase() === company &&
      (e.city || "").trim().toLowerCase() === city
    )
      return true;
    return false;
  });
}

// Classify parsed rows: { lead, status: "new"|"duplicate"|"error", reason }.
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

export function isBlankRow(row) {
  return !row || row.every((c) => String(c ?? "").trim() === "");
}
