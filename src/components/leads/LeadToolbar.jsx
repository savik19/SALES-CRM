"use client";

import MultiSelectDropdown from "./MultiSelectDropdown";
import ColumnPicker from "./ColumnPicker";
import { dscName } from "@/data/mockLeads";

// Follow-up date-range quick presets.
export const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "week", label: "This Week" },
];

// The multi-select filters, in display order. `key` matches a lead field
// (except assignedDscId which stores an id but shows a name).
const ALL_FILTER_DEFS = [
  { key: "leadStatus", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "industry", label: "Industry" },
  { key: "city", label: "City" },
  { key: "assignedDscId", label: "DSC" },
  { key: "leadSource", label: "Source" },
];

function chipValueLabel(filterKey, value) {
  return filterKey === "assignedDscId" ? dscName(value) : value;
}

// Everything above the table: search + result count, import (BDM), the filter
// bar, active filter chips, and the column picker. Fully controlled.
export default function LeadToolbar({
  search,
  onSearch,
  count,
  total,
  filters,
  onFilterChange,
  datePreset,
  onDatePreset,
  onClearAll,
  options,
  visibleColumns,
  onColumnsChange,
  showDscFilter = true,
  canImport = false,
  onImport,
}) {
  const filterDefs = showDscFilter
    ? ALL_FILTER_DEFS
    : ALL_FILTER_DEFS.filter((d) => d.key !== "assignedDscId");

  const activeChips = [];
  for (const def of filterDefs) {
    for (const value of filters[def.key]) {
      activeChips.push({
        filterKey: def.key,
        value,
        label: `${def.label}: ${chipValueLabel(def.key, value)}`,
      });
    }
  }
  if (datePreset) {
    const preset = DATE_PRESETS.find((p) => p.key === datePreset);
    activeChips.push({
      filterKey: "__date",
      value: datePreset,
      label: `Follow-up: ${preset?.label}`,
    });
  }

  function removeChip(chip) {
    if (chip.filterKey === "__date") onDatePreset("");
    else
      onFilterChange(
        chip.filterKey,
        filters[chip.filterKey].filter((v) => v !== chip.value)
      );
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      {/* Search + import + column picker row */}
      <div className="flex flex-col gap-3 px-6 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search company, contact, email, phone, lead id, city, notes…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">{count}</span> of{" "}
            {total} leads
          </span>
          {canImport ? (
            <button
              type="button"
              onClick={onImport}
              className="whitespace-nowrap rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              ⬆ Import Excel
            </button>
          ) : null}
          <ColumnPicker visible={visibleColumns} onChange={onColumnsChange} />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
        {filterDefs.map((def) => (
          <MultiSelectDropdown
            key={def.key}
            label={def.label}
            options={options[def.key]}
            selected={filters[def.key]}
            onChange={(vals) => onFilterChange(def.key, vals)}
          />
        ))}

        <div className="ml-1 inline-flex overflow-hidden rounded-lg border border-slate-300">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onDatePreset(datePreset === p.key ? "" : p.key)}
              className={`px-3 py-2 text-sm transition-colors ${
                datePreset === p.key
                  ? "bg-brand text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length ? (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          {activeChips.map((chip) => (
            <span
              key={`${chip.filterKey}-${chip.value}`}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-medium text-brand-700"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip)}
                className="rounded-full p-0.5 hover:bg-brand-100"
                aria-label={`Remove ${chip.label}`}
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
