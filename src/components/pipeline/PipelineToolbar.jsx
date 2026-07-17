"use client";

import MultiSelectDropdown from "@/components/leads/MultiSelectDropdown";
import { dscName } from "@/data/mockLeads";
import { formatINR, monthLabel } from "@/lib/format";

// Read-only stat in the overview strip.
function Stat({ label, value, tone = "slate", title }) {
  const tones = {
    slate: "text-slate-800",
    red: "text-red-600",
    amber: "text-amber-600",
    green: "text-green-600",
    brand: "text-brand-700",
  };
  return (
    <div
      className="min-w-[7rem] rounded-lg border border-slate-200 bg-white px-3 py-2"
      title={title}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`text-lg font-semibold ${tones[tone] || tones.slate}`}>
        {value}
      </div>
    </div>
  );
}

const FILTER_DEFS = [
  { key: "leadStatus", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "industry", label: "Industry" },
  { key: "city", label: "City" },
  { key: "leadSource", label: "Source" },
  { key: "assignedDscId", label: "DSC" },
];

function chipLabel(key, value) {
  return key === "assignedDscId" ? dscName(value) : value;
}

// Label for the custom-range chip: a single day, an open-ended range, or a
// closed range.
function rangeChipLabel(from, to) {
  if (from && to) return from === to ? from : `${from} – ${to}`;
  if (from) return `from ${from}`;
  return `until ${to}`;
}

// Pipeline toolbar: a period control (month, or a calendar range) + an overview
// strip of period stats, then a filter bar (search + multi-selects) + chips.
// Fully controlled by the page.
export default function PipelineToolbar({
  count,
  stats,
  search,
  onSearch,
  month,
  months,
  onMonth,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  filters,
  onFilterChange,
  options,
  showDscFilter,
  onClearAll,
}) {
  const filterDefs = showDscFilter
    ? FILTER_DEFS
    : FILTER_DEFS.filter((d) => d.key !== "assignedDscId");

  // A custom calendar range overrides the month selector.
  const customPeriod = Boolean(dateFrom || dateTo);

  const activeChips = [];
  for (const def of filterDefs)
    for (const v of filters[def.key])
      activeChips.push({
        key: def.key,
        value: v,
        label: `${def.label}: ${chipLabel(def.key, v)}`,
      });
  if (customPeriod)
    activeChips.push({
      key: "__period",
      value: `${dateFrom}|${dateTo}`,
      label: `Period: ${rangeChipLabel(dateFrom, dateTo)}`,
    });

  function removeChip(chip) {
    if (chip.key === "__period") {
      onDateFrom("");
      onDateTo("");
    } else
      onFilterChange(
        chip.key,
        filters[chip.key].filter((v) => v !== chip.value)
      );
  }

  // Keep the custom range coherent (from ≤ to).
  function setFrom(v) {
    onDateFrom(v);
    if (v && dateTo && v > dateTo) onDateTo("");
  }
  function setTo(v) {
    onDateTo(v);
    if (v && dateFrom && v < dateFrom) onDateFrom("");
  }

  const hasActive =
    activeChips.length > 0 || search.trim().length > 0 || customPeriod;

  const periodLabel = customPeriod
    ? rangeChipLabel(dateFrom, dateTo)
    : monthLabel(month);

  return (
    <div className="border-b border-slate-200 bg-white">
      {/* Period control */}
      <div className="flex flex-wrap items-center gap-3 px-6 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Show</span>
          <select
            value={month}
            disabled={customPeriod}
            onChange={(e) => onMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-100 disabled:text-slate-400"
            title="Show leads worked in this month"
          >
            {months.map((ym) => (
              <option key={ym} value={ym}>
                {monthLabel(ym)}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">or</span>
          <div
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
              customPeriod ? "border-brand" : "border-slate-300"
            }`}
          >
            <span className="whitespace-nowrap text-xs font-medium text-slate-500">
              Range
            </span>
            <input
              type="date"
              value={dateFrom || ""}
              max={dateTo || undefined}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Period from date"
              className="rounded border border-slate-200 bg-white px-1.5 py-1 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              value={dateTo || ""}
              min={dateFrom || undefined}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Period to date"
              className="rounded border border-slate-200 bg-white px-1.5 py-1 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {customPeriod ? (
              <button
                type="button"
                onClick={() => {
                  onDateFrom("");
                  onDateTo("");
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear custom range (back to month)"
                title="Back to month"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
        <span className="ml-auto text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{count}</span>{" "}
          of {stats.total} · {periodLabel}
        </span>
      </div>

      {/* Overview strip — period stats */}
      <div className="flex flex-wrap items-center gap-2 px-6 pt-3">
        <Stat
          label="In pipeline"
          value={stats.total}
          title="Leads in the funnel (Contacted onward) worked in the selected period. New, unworked leads live in the Lead Table."
        />
        <Stat
          label="Open value"
          value={formatINR(stats.openValue)}
          tone="brand"
          title="Total quoted value of open (active) leads in the period."
        />
        <Stat
          label="Won"
          value={stats.won}
          tone="green"
          title="Leads won/closed in the period."
        />
        <Stat
          label="Won value"
          value={formatINR(stats.wonValue)}
          tone="green"
          title="Total closed amount of leads won in the period."
        />
        <Stat
          label="Overdue"
          value={stats.overdue}
          tone="red"
          title="Open leads whose next follow-up date is today or in the past."
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
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

        {filterDefs.map((def) => (
          <MultiSelectDropdown
            key={def.key}
            label={def.label}
            options={options[def.key]}
            selected={filters[def.key]}
            onChange={(vals) => onFilterChange(def.key, vals)}
          />
        ))}

        {hasActive ? (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* Active chips */}
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
                onClick={() => removeChip(chip)}
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
