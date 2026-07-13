"use client";

import { useEffect, useRef, useState } from "react";

// Dropdown of checkboxes to toggle which columns are visible. Columns come in
// grouped (in schema order). All columns are visible by default; "Select all"
// checks every column, "Reset" clears them all (per the product spec).
// Controlled — parent owns `visible` (a Set of column keys).
export default function ColumnPicker({ groups, allKeys, visible, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(key) {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span>⚙ Columns</span>
        <span className="text-slate-400">
          {visible.size}/{allKeys.length}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 max-h-96 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Show columns
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(new Set(allKeys))}
                className="text-xs font-medium text-brand hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="text-xs font-medium text-slate-500 hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
          {groups.map((group) => (
            <div key={group.name} className="mb-1">
              <div className="px-2 pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.name}
              </div>
              {group.columns.map((col) => (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={visible.has(col.key)}
                    onChange={() => toggle(col.key)}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
