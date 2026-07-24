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

// Discount % = (Quoted − Final) / Quoted × 100. COMPUTED, never stored.
// Reads `finalAmount` (deals), falling back to legacy `closedAmount`.
// Returns a number, or null when it can't be computed (no quoted / no final).
export function discountPct(deal) {
  const quoted = Number(deal.quotedAmount);
  const finalRaw = deal.finalAmount ?? deal.closedAmount;
  const final = Number(finalRaw);
  if (!quoted || Number.isNaN(quoted)) return null; // dash when Quoted is empty
  if (finalRaw === null || finalRaw === undefined) return null;
  if (Number.isNaN(final)) return null;
  return ((quoted - final) / quoted) * 100;
}

// Discount % as a display string, e.g. "12.6%" or "—".
export function discountPctLabel(lead) {
  const pct = discountPct(lead);
  if (pct === null) return "—";
  // Whole numbers show clean; otherwise one decimal.
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

// Whole months elapsed since an ISO date (used for training window + tenure).
// Returns null when the date is missing/invalid. `now` is injectable for tests.
export function monthsSince(iso, now = new Date()) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1; // not a full month yet
  return Math.max(0, months);
}

// Human tenure from a joining date, e.g. "1 yr 3 mo", "5 mo", "< 1 mo", "—".
export function employmentDuration(iso, now = new Date()) {
  const m = monthsSince(iso, now);
  if (m === null) return "—";
  if (m === 0) return "< 1 mo";
  const years = Math.floor(m / 12);
  const rem = m % 12;
  const parts = [];
  if (years) parts.push(`${years} yr`);
  if (rem) parts.push(`${rem} mo`);
  return parts.join(" ");
}

// ---- Month helpers (for the analytics month filter) -----------------------

// "YYYY-MM" key for a date.
export function monthKeyOf(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Friendly label for a "YYYY-MM" key, e.g. "Jul 2026".
export function monthLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

// The most recent `count` months as "YYYY-MM" keys, newest first.
export function recentMonths(count = 6, now = new Date()) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}

// Does an ISO date fall in the given "YYYY-MM" month?
export function inMonth(iso, ym) {
  return !!iso && !!ym && String(iso).slice(0, 7) === ym;
}

// The inclusive ISO bounds { from, to } spanning a whole "YYYY-MM" month, e.g.
// "2026-07" -> { from: "2026-07-01", to: "2026-07-31" }.
export function monthRange(ym) {
  if (!ym) return { from: "", to: "" };
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` };
}

// Is an ISO date within [from, to] inclusive? An empty bound is open on that
// side. A missing date is never in range. (String compare is safe for ISO.)
export function isoInRange(iso, from, to) {
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
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
