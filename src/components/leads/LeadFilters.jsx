"use client";

import { LEAD_STATUSES } from "@/data/statuses";
import { DSCS } from "@/data/users";

// Toolbar above the table: search box, status filter, DSC filter, and a
// live result count. Purely controlled — parent owns the state.
export default function LeadFilters({
  search,
  onSearch,
  status,
  onStatus,
  dsc,
  onDsc,
  showDscFilter = true,
  count,
  total,
}) {
  const selectClasses =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search company, contact, city…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className={selectClasses}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {/* DSC filter — hidden when the viewer is a DSC (they only see their own) */}
        {showDscFilter ? (
          <select
            value={dsc}
            onChange={(e) => onDsc(e.target.value)}
            className={selectClasses}
            aria-label="Filter by assigned DSC"
          >
            <option value="all">All DSCs</option>
            {DSCS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-700">{count}</span> of{" "}
        {total} leads
      </div>
    </div>
  );
}
