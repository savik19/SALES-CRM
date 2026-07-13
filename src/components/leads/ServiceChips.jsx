"use client";

import { useEffect, useRef, useState } from "react";

// Renders a multi-select Services array as small chips inside a cell.
// Shows the first `max`, then a "+N" badge; clicking the badge reveals the rest
// in a popover. Set `expanded` to always show all (used in the expanded row).
export default function ServiceChips({ values, max = 2, expanded = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!values || values.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const shown = expanded ? values : values.slice(0, max);
  const extra = values.length - shown.length;

  return (
    <div className="relative flex flex-wrap items-center gap-1" ref={ref}>
      {shown.map((v) => (
        <span
          key={v}
          className="inline-flex items-center whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
        >
          {v}
        </span>
      ))}
      {extra > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
          title={values.slice(max).join(", ")}
        >
          +{extra}
        </button>
      ) : null}

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-max max-w-xs rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex flex-wrap gap-1">
            {values.map((v) => (
              <span
                key={v}
                className="inline-flex items-center whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
