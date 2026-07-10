"use client";

// Generic page header used across screens.
// `title` + optional `subtitle` on the left, optional `right` slot for controls.
export default function Topbar({ title, subtitle, right }) {
  return (
    <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-3">{right}</div> : null}
    </header>
  );
}
