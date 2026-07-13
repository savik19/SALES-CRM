"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import LeadToolbar from "@/components/leads/LeadToolbar";
import LeadTable from "@/components/leads/LeadTable";
import LeadDetailPanel from "@/components/leads/LeadDetailPanel";
import {
  COLUMNS,
  DEFAULT_VISIBLE_KEYS,
  SEARCHABLE_KEYS,
} from "@/components/leads/columns";
import { getLeads } from "@/lib/leadsApi";
import { discountPct } from "@/lib/format";
import {
  LEAD_STATUSES,
  PRIORITIES,
  INDUSTRIES,
  LEAD_SOURCES,
  DSCS,
  dscName,
} from "@/data/mockLeads";

// The six multi-select filters start empty.
const EMPTY_FILTERS = {
  leadStatus: [],
  priority: [],
  industry: [],
  city: [],
  assignedDscId: [],
  leadSource: [],
};

// ---- Sorting ---------------------------------------------------------------
// Compare two leads on a column, honouring the column's sortType.
function compareLeads(a, b, column, dir) {
  const factor = dir === "asc" ? 1 : -1;
  const key = column.key;

  switch (column.sortType) {
    case "status": {
      return (
        (LEAD_STATUSES.indexOf(a.leadStatus) -
          LEAD_STATUSES.indexOf(b.leadStatus)) *
        factor
      );
    }
    case "priority": {
      return (
        (PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)) *
        factor
      );
    }
    case "dsc": {
      return (
        dscName(a.assignedDscId).localeCompare(dscName(b.assignedDscId)) *
        factor
      );
    }
    case "services": {
      // By count, then by the joined names.
      const av = a[key] || [];
      const bv = b[key] || [];
      if (av.length !== bv.length) return (av.length - bv.length) * factor;
      return av.join(",").localeCompare(bv.join(",")) * factor;
    }
    case "number": {
      return compareNumbers(a[key], b[key], factor);
    }
    case "discount": {
      return compareNumbers(discountPct(a), discountPct(b), factor);
    }
    case "date": {
      // Empty dates sort to the bottom regardless of direction.
      const av = a[key];
      const bv = b[key];
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * factor;
    }
    default: {
      // text
      const av = (a[key] ?? "").toString().toLowerCase();
      const bv = (b[key] ?? "").toString().toLowerCase();
      if (av === bv) return 0;
      // Blanks sort to the bottom.
      if (!av) return 1;
      if (!bv) return -1;
      return av < bv ? -1 * factor : 1 * factor;
    }
  }
}

// Numeric compare with null/empty values pushed to the bottom.
function compareNumbers(a, b, factor) {
  const an = a === null || a === undefined || a === "" ? null : Number(a);
  const bn = b === null || b === undefined || b === "" ? null : Number(b);
  if (an === null && bn === null) return 0;
  if (an === null) return 1;
  if (bn === null) return -1;
  return (an - bn) * factor;
}

// ---- Date-range presets on Next Follow-up Date -----------------------------
function matchesDatePreset(iso, preset) {
  if (!preset) return true;
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (preset === "today") return d.getTime() === start.getTime();
  if (preset === "overdue") return d.getTime() < start.getTime();
  if (preset === "week") {
    // Current calendar week, Monday–Sunday.
    const dow = (start.getDay() + 6) % 7; // 0 = Monday
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - dow);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return d >= weekStart && d <= weekEnd;
  }
  return true;
}

export default function LeadsPage() {
  // ---- Data ----------------------------------------------------------------
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getLeads().then((rows) => {
      if (active) {
        setAllLeads(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // ---- Controls ------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [datePreset, setDatePreset] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null }); // off by default
  const [visibleCols, setVisibleCols] = useState(
    () => new Set(DEFAULT_VISIBLE_KEYS)
  );
  const [selected, setSelected] = useState(null);

  function handleFilterChange(key, values) {
    setFilters((f) => ({ ...f, [key]: values }));
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTERS);
    setDatePreset("");
  }

  // Sort cycle per column: asc → desc → off.
  function handleSort(key) {
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  }

  // City options are derived from the data (unique, sorted).
  const cityOptions = useMemo(
    () =>
      Array.from(new Set(allLeads.map((l) => l.city).filter(Boolean))).sort(),
    [allLeads]
  );

  const filterOptions = {
    leadStatus: LEAD_STATUSES,
    priority: PRIORITIES,
    industry: INDUSTRIES,
    city: cityOptions,
    assignedDscId: DSCS.map((d) => ({ value: d.id, label: d.name })),
    leadSource: LEAD_SOURCES,
  };

  // Columns to render, in schema order, filtered to the visible set.
  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => visibleCols.has(c.key)),
    [visibleCols]
  );

  // ---- Search + filter + sort ----------------------------------------------
  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = allLeads.filter((lead) => {
      // AND across filters, OR within a single filter.
      for (const key of Object.keys(EMPTY_FILTERS)) {
        const selectedVals = filters[key];
        if (selectedVals.length > 0 && !selectedVals.includes(lead[key])) {
          return false;
        }
      }
      if (!matchesDatePreset(lead.nextFollowUpDate, datePreset)) return false;

      if (q) {
        const haystack = SEARCHABLE_KEYS.map((k) => lead[k])
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sort.key) {
      const column = COLUMNS.find((c) => c.key === sort.key);
      rows = [...rows].sort((a, b) => compareLeads(a, b, column, sort.dir));
    }
    return rows;
  }, [allLeads, search, filters, datePreset, sort]);

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Lead Table"
        subtitle="All leads — search, filter, sort, and pick your columns"
      />

      <LeadToolbar
        search={search}
        onSearch={setSearch}
        count={visibleLeads.length}
        total={allLeads.length}
        filters={filters}
        onFilterChange={handleFilterChange}
        datePreset={datePreset}
        onDatePreset={setDatePreset}
        onClearAll={clearAllFilters}
        options={filterOptions}
        visibleColumns={visibleCols}
        onColumnsChange={setVisibleCols}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading leads…
          </div>
        ) : (
          <LeadTable
            leads={visibleLeads}
            columns={visibleColumns}
            sortBy={sort.key}
            sortDir={sort.dir}
            onSort={handleSort}
            onRowClick={setSelected}
            selectedId={selected?.leadId}
          />
        )}
      </div>

      <LeadDetailPanel lead={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
