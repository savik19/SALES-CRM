"use client";

import { useEffect, useRef, useState } from "react";

// A reusable multi-select filter control: a button that opens a checkbox list.
// Controlled — the parent owns `selected` (array of values) and gets updates
// via `onChange`. Options are strings or { value, label } objects.
export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click / Escape.
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

  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  function toggle(value) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const count = selected.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
          count > 0
            ? "border-brand bg-brand-50 text-brand-700"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span>{label}</span>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
            {count}
          </span>
        ) : null}
        <span className="text-slate-400">▾</span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {normalized.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
