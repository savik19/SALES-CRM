// ---------------------------------------------------------------------------
// Date-window matching for filters (pure). Used by the Pipeline board to filter
// on Next Follow-up (forward: overdue / today / this week / next 7 days) and on
// Last Contact (backward: last 7 / last 30 days / this month).
// `now` is injectable so renders stay deterministic in tests.
// ---------------------------------------------------------------------------

function startOfToday(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function matchesDateWindow(iso, preset, now = new Date()) {
  if (!preset) return true;
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;

  const start = startOfToday(now);
  const endToday = new Date(start);
  endToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case "overdue":
      return d.getTime() < start.getTime();
    case "today":
      return d.getTime() === start.getTime();
    case "week": {
      // current calendar week, Monday–Sunday
      const dow = (start.getDay() + 6) % 7;
      const ws = new Date(start);
      ws.setDate(start.getDate() - dow);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      we.setHours(23, 59, 59, 999);
      return d >= ws && d <= we;
    }
    case "next7": {
      const e = new Date(start);
      e.setDate(start.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return d >= start && d <= e;
    }
    case "last7": {
      const s = new Date(start);
      s.setDate(start.getDate() - 6);
      return d >= s && d <= endToday;
    }
    case "last30": {
      const s = new Date(start);
      s.setDate(start.getDate() - 29);
      return d >= s && d <= endToday;
    }
    case "thisMonth": {
      const s = new Date(start.getFullYear(), start.getMonth(), 1);
      const e = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      return d >= s && d <= e;
    }
    default:
      return true;
  }
}
