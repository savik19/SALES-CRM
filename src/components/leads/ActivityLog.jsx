"use client";

import { useState } from "react";
import { auditFor } from "@/lib/audit";

// Collapsible "Activity" section — the last 20 audit entries for one entity
// (lead or deal). Reads the in-memory audit store (lib/audit); the Laravel team
// swaps this for GET /api/audit. Values are already human labels (the data layer
// records labels for status/stage/approval changes).
function fmt(v) {
  if (v === "" || v === null || v === undefined) return "—";
  return String(v);
}

export default function ActivityLog({ entityType, entityId, limit = 20 }) {
  const [open, setOpen] = useState(false);
  const entries = auditFor(entityType, entityId, limit);

  return (
    <div className="border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        <span>Activity ({entries.length})</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        entries.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">No recorded activity yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="text-xs text-slate-600">
                <div>
                  <span className="font-medium text-slate-700">{e.field}</span>{" "}
                  <span className="text-slate-400">
                    {fmt(e.from)} → {fmt(e.to)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {e.role || "system"} · {new Date(e.at).toLocaleString()}
                  {e.reason ? ` · “${e.reason}”` : ""}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
