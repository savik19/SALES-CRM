// ---------------------------------------------------------------------------
// Small display / computation helpers (pure, no business logic beyond display).
// ---------------------------------------------------------------------------

// Render an ISO date ("2026-07-11") as "11 Jul 2026". Empty -> "—".
export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Show a value or a dash placeholder for empty / "-" / "N/A".
export function orDash(value) {
  if (value === undefined || value === null) return "—";
  const v = String(value).trim();
  if (v === "" || v === "-" || v.toLowerCase() === "n/a") return "—";
  return v;
}

// Format a Rupee amount with Indian digit grouping: 250000 -> "Rs. 2,50,000".
// null/undefined/"" -> "—".
export function formatINR(amount) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return "—";
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

// Discount % = (Quoted − Closed) / Quoted × 100. COMPUTED, never stored.
// Returns a number, or null when it can't be computed (no quoted / no closed).
export function discountPct(lead) {
  const quoted = Number(lead.quotedAmount);
  const closed = Number(lead.closedAmount);
  if (!quoted || Number.isNaN(quoted)) return null; // dash when Quoted is empty
  if (lead.closedAmount === null || lead.closedAmount === undefined)
    return null;
  if (Number.isNaN(closed)) return null;
  return ((quoted - closed) / quoted) * 100;
}

// Discount % as a display string, e.g. "12.6%" or "—".
export function discountPctLabel(lead) {
  const pct = discountPct(lead);
  if (pct === null) return "—";
  // Whole numbers show clean; otherwise one decimal.
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

// Is a date today or in the past? (drives the "overdue" follow-up styling)
// `today` is injectable so callers can keep renders deterministic.
export function isOnOrBefore(iso, today = new Date()) {
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  return d.getTime() <= end.getTime();
}
