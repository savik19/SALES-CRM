"use client";

import MultiSelectDropdown from "@/components/leads/MultiSelectDropdown";
import { dscName } from "@/data/mockLeads";
import { matchesDateWindow } from "@/lib/dateFilters";

// Clickable stat pill in the overview strip — doubles as the follow-up filter.
function StatPill({ label, value, tone, active, onClick }) {
  const tones = {
    slate: "text-slate-700",
    red: "text-red-600",
    amber: "text-amber-600",
    brand: "text-brand-700",
  };
  const ring = active ? "ring-2 ring-brand ring-offset-1" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[7rem] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand ${ring}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className={`text-lg font-semibold ${tones[tone] || tones.slate}`}>
        {value}
      </span>
    </button>
  );
}

const FILTER_DEFS = [
  { key: "priority", label: "Priority" },
  { key: "industry", label: "Industry" },
  { key: "city", label: "City" },
  { key: "leadSource", label: "Source" },
  { key: "assignedDscId", label: "DSC" },
];

const ACTIVITY_PRESETS = [
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
];

function chipLabel(key, value) {
  return key === "assignedDscId" ? dscName(value) : value;
}

// Pipeline toolbar: an overview strip (clickable follow-up stats) + a filter bar
// (search, multi-select filters, a "last activity" range), + active chips.
export default function PipelineToolbar({
  scoped,
  count,
  total,
  search,
  onSearch,
  followUp,
  onFollowUp,
  activity,
  onActivity,
  filters,
  onFilterChange,
  options,
  showDscFilter,
  onClearAll,
}) {
  // Overview counts over the whole (role-scoped) book, independent of filters.
  const overdue = scoped.filter((l) =>
    matchesDateWindow(l.nextFollowUpDate, "overdue")
  ).length;
  const dueToday = scoped.filter((l) =>
    matchesDateWindow(l.nextFollowUpDate, "today")
  ).length;
  const thisWeek = scoped.filter((l) =>
    matchesDateWindow(l.nextFollowUpDate, "week")
  ).length;

  const filterDefs = showDscFilter
    ? FILTER_DEFS
    : FILTER_DEFS.filter((d) => d.key !== "assignedDscId");

  const activeChips = [];
  for (const def of filterDefs)
    for (const v of filters[def.key])
      activeChips.push({
        key: def.key,
        value: v,
        label: `${def.label}: ${chipLabel(def.key, v)}`,
      });
  if (activity) {
    const a = ACTIVITY_PRESETS.find((p) => p.key === activity);
    activeChips.push({
      key: "__activity",
      value: activity,
      label: `Activity: ${a?.label}`,
    });
  }

  function removeChip(chip) {
    if (chip.key === "__activity") onActivity("");
    else
      onFilterChange(
        chip.key,
        filters[chip.key].filter((v) => v !== chip.value)
      );
  }

  const hasActive =
    activeChips.length > 0 || followUp || search.trim().length > 0;

  return (
    <div className="border-b border-slate-200 bg-white">
      {/* Overview strip */}
      <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
        <StatPill label="Total" value={total} tone="slate" />
        <StatPill
          label="Overdue"
          value={overdue}
          tone="red"
          active={followUp === "overdue"}
          onClick={() => onFollowUp(followUp === "overdue" ? "" : "overdue")}
        />
        <StatPill
          label="Due today"
          value={dueToday}
          tone="amber"
          active={followUp === "today"}
          onClick={() => onFollowUp(followUp === "today" ? "" : "today")}
        />
        <StatPill
          label="This week"
          value={thisWeek}
          tone="brand"
          active={followUp === "week"}
          onClick={() => onFollowUp(followUp === "week" ? "" : "week")}
        />
        <span className="ml-auto text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{count}</span>{" "}
          of {total}
        </span>
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

        {/* Last activity range (Last Contact Date) */}
        <div className="ml-1 inline-flex overflow-hidden rounded-lg border border-slate-300">
          {ACTIVITY_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onActivity(activity === p.key ? "" : p.key)}
              className={`px-3 py-2 text-sm transition-colors ${
                activity === p.key
                  ? "bg-brand text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title="Filter by Last Contact Date"
            >
              {p.label}
            </button>
          ))}
        </div>

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
