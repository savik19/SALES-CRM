// ---------------------------------------------------------------------------
// Small display helpers (pure, no business logic).
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

// Is a "next follow-up" date today or in the past? (drives overdue highlight)
// `today` is injectable so callers can keep renders deterministic.
export function isFollowUpDue(iso, today = new Date()) {
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  return d.getTime() <= end.getTime();
}
