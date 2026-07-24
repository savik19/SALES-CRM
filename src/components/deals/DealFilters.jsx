"use client";

import MultiSelectDropdown from "@/components/leads/MultiSelectDropdown";
import { dscName } from "@/data/mockLeads";
import { labelOf } from "@/lib/statuses";

// Filter + search bar for the Deals table view. Deal-native fields (stage,
// owner, offering type, approval) — the page owns the state; this is presentation.
const FILTER_DEFS = [
  { key: "stage", label: "Stage" },
  { key: "ownerId", label: "Owner" },
  { key: "offeringKind", label: "Type" },
  { key: "approval", label: "Approval" },
];

function chipLabel(key, value) {
  if (key === "ownerId") return dscName(value);
  if (key === "stage" || key === "approval") return labelOf(value);
  return value;
}

export default function DealFilters({
  search,
  onSearch,
  count,
  total,
  filters,
  onFilterChange,
  options,
  showOwnerFilter,
  onClearAll,
}) {
  const filterDefs = showOwnerFilter
    ? FILTER_DEFS
    : FILTER_DEFS.filter((d) => d.key !== "ownerId");

  const activeChips = [];
  for (const def of filterDefs)
    for (const v of filters[def.key])
      activeChips.push({
        key: def.key,
        value: v,
        label: `${def.label}: ${chipLabel(def.key, v)}`,
      });

  const hasActive = activeChips.length > 0 || search.trim().length > 0;

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search company, offering…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {filterDefs.map((def) => (
          <MultiSelectDropdown
            key={def.key}
            label={def.label}
            options={options[def.key]}
            selected={filters[def.key]}
            onChange={(vals) => onFilterChange(def.key, vals)}
          />
        ))}

        <span className="ml-auto text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{count}</span>{" "}
          of {total} deals
        </span>

        {hasActive ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {activeChips.length ? (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          {activeChips.map((chip) => (
            <span
              key={`${chip.key}-${chip.value}`}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-medium text-brand-700"
            >
              {chip.label}
              <button
                type="button"
                onClick={() =>
                  onFilterChange(
                    chip.key,
                    filters[chip.key].filter((v) => v !== chip.value)
                  )
                }
                className="rounded-full p-0.5 hover:bg-brand-100"
                aria-label={`Remove ${chip.label}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
