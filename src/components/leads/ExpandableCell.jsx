"use client";

import { useEffect, useRef, useState } from "react";

// A cell whose content is truncated to a single line with an ellipsis. The full
// value is available two ways (per the UX spec):
//   - hover  → native tooltip (title attribute)
//   - click  → a popover showing the full content
// Used for long/among-many text: Company, Phone (multiple), Email (multiple),
// Website, LinkedIn, Notes, etc.
export default function ExpandableCell({ text, className = "" }) {
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

  const value = text === null || text === undefined ? "" : String(text).trim();
  if (value === "" || value === "-") {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={value}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`block w-full truncate text-left hover:text-slate-900 ${className}`}
      >
        {value}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-72 max-w-[18rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg">
          {value}
        </div>
      ) : null}
    </div>
  );
}
