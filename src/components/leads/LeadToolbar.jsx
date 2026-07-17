"use client";

import MultiSelectDropdown from "./MultiSelectDropdown";
import ColumnPicker from "./ColumnPicker";
import { dscName } from "@/data/mockLeads";

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

// Human label for the follow-up date chip: a single day, an open-ended range,
// or a closed range.
function dateChipLabel(from, to) {
  if (from && to) return from === to ? from : `${from} – ${to}`;
  if (from) return `from ${from}`;
  return `until ${to}`;
}

// Everything above the table: search + result count, import (BDM), the filter
// bar (multi-selects + a follow-up calendar), active filter chips, and the
// column picker. Fully controlled.
export default function LeadToolbar({
  search,
  onSearch,
  count,
  total,
  filters,
  onFilterChange,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  onClearAll,
  options,
  visibleColumns,
  onColumnsChange,
  showDscFilter = true,
  canImport = false,
  onImport,
  columnGroups,
  columnKeys,
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
  if (dateFrom || dateTo) {
    activeChips.push({
      filterKey: "__date",
      value: `${dateFrom}|${dateTo}`,
      label: `Follow-up: ${dateChipLabel(dateFrom, dateTo)}`,
    });
  }

  function removeChip(chip) {
    if (chip.filterKey === "__date") {
      onDateFrom("");
      onDateTo("");
    } else
      onFilterChange(
        chip.filterKey,
        filters[chip.filterKey].filter((v) => v !== chip.value)
      );
  }

  // Keep the range coherent: picking a "From" after the current "To" clears
  // the "To" (and vice-versa) so we never hold an impossible window.
  function setFrom(v) {
    onDateFrom(v);
    if (v && dateTo && v > dateTo) onDateTo("");
  }
  function setTo(v) {
    onDateTo(v);
    if (v && dateFrom && v < dateFrom) onDateFrom("");
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
          <ColumnPicker
            groups={columnGroups}
            allKeys={columnKeys}
            visible={visibleColumns}
            onChange={onColumnsChange}
          />
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

        {/* Follow-up calendar: pick a single day (set both to the same date via
            the From field) or a From–To range. Leaving one side blank makes it
            open-ended. */}
        <div className="ml-1 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5">
          <span className="whitespace-nowrap text-xs font-medium text-slate-500">
            Follow-up
          </span>
          <input
            type="date"
            value={dateFrom || ""}
            max={dateTo || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Follow-up from date"
            className="rounded border border-slate-200 bg-white px-1.5 py-1 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <span className="text-slate-400">–</span>
          <input
            type="date"
            value={dateTo || ""}
            min={dateFrom || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Follow-up to date"
            className="rounded border border-slate-200 bg-white px-1.5 py-1 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {dateFrom || dateTo ? (
            <button
              type="button"
              onClick={() => {
                onDateFrom("");
                onDateTo("");
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear follow-up dates"
            >
              ✕
            </button>
          ) : null}
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
