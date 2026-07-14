"use client";

import { useState } from "react";
import { useActiveDscs } from "@/lib/usersConfig";

// Sticky action bar shown (BDM only) when one or more leads are selected.
// The core post-import workflow: filter to New + Unassigned, select, assign.
export default function BulkAssignBar({ count, onAssign, onClear }) {
  const [dscId, setDscId] = useState("");
  const dscs = useActiveDscs();

  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 bg-brand-50 px-6 py-3">
      <span className="text-sm font-medium text-brand-700">
        {count} selected
      </span>
      <select
        value={dscId}
        onChange={(e) => setDscId(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <option value="">Assign to…</option>
        {dscs.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!dscId}
        onClick={() => {
          onAssign(dscId);
          setDscId("");
        }}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Assign
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
      >
        Clear selection
      </button>
    </div>
  );
}
