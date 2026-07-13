"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import LeadToolbar from "@/components/leads/LeadToolbar";
import LeadTable from "@/components/leads/LeadTable";
import ExpandedLeadRow from "@/components/leads/ExpandedLeadRow";
import LeadDetailSidebar from "@/components/leads/LeadDetailSidebar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import BulkAssignBar from "@/components/leads/BulkAssignBar";
import ImportModal from "@/components/leads/ImportModal";
import {
  allKeys,
  searchableKeys,
  importColumns,
  groupsOf,
  byKey,
} from "@/components/leads/columns";
import { useColumnConfig } from "@/lib/columnConfig";
import { getLeads, updateLead, assignLeads } from "@/lib/leadsApi";
import { discountPct } from "@/lib/format";
import {
  LEAD_STATUSES,
  PRIORITIES,
  INDUSTRIES,
  LEAD_SOURCES,
  DSCS,
  USER_BY_ID,
  dscName,
} from "@/data/mockLeads";

const EMPTY_FILTERS = {
  leadStatus: [],
  priority: [],
  industry: [],
  city: [],
  assignedDscId: [],
  leadSource: [],
};

// ---- Sorting ---------------------------------------------------------------
function compareNumbers(a, b, factor) {
  const an = a === null || a === undefined || a === "" ? null : Number(a);
  const bn = b === null || b === undefined || b === "" ? null : Number(b);
  if (an === null && bn === null) return 0;
  if (an === null) return 1;
  if (bn === null) return -1;
  return (an - bn) * factor;
}

function compareLeads(a, b, column, dir) {
  const factor = dir === "asc" ? 1 : -1;
  const key = column.key;
  switch (column.sortType) {
    case "status":
      return (
        (LEAD_STATUSES.indexOf(a.leadStatus) -
          LEAD_STATUSES.indexOf(b.leadStatus)) *
        factor
      );
    case "priority":
      return (
        (PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)) *
        factor
      );
    case "dsc":
      return (
        dscName(a.assignedDscId).localeCompare(dscName(b.assignedDscId)) *
        factor
      );
    case "services": {
      const av = a[key] || [];
      const bv = b[key] || [];
      if (av.length !== bv.length) return (av.length - bv.length) * factor;
      return av.join(",").localeCompare(bv.join(",")) * factor;
    }
    case "number":
      return compareNumbers(a[key], b[key], factor);
    case "discount":
      return compareNumbers(discountPct(a), discountPct(b), factor);
    case "date": {
      const av = a[key];
      const bv = b[key];
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * factor;
    }
    default: {
      const av = (a[key] ?? "").toString().toLowerCase();
      const bv = (b[key] ?? "").toString().toLowerCase();
      if (av === bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return av < bv ? -1 * factor : 1 * factor;
    }
  }
}

// ---- Follow-up date presets ------------------------------------------------
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
    const dow = (start.getDay() + 6) % 7;
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
  // ---- Role (demo switcher; real auth replaces this) -----------------------
  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = USER_BY_ID[viewerId];
  const isBDM = viewer?.role === "bdm";

  // ---- Editable column config (labels, aliases, add/remove) ----------------
  const { columns } = useColumnConfig();
  const colKeys = useMemo(() => allKeys(columns), [columns]);
  const searchKeys = useMemo(() => searchableKeys(columns), [columns]);
  const importCols = useMemo(() => importColumns(columns), [columns]);
  const groups = useMemo(() => groupsOf(columns), [columns]);
  const colByKey = useMemo(() => byKey(columns), [columns]);

  // ---- Data (working set the page owns; import/assign/edit mutate it) -------
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
  const [sort, setSort] = useState({ key: null, dir: null });
  // All columns are visible by default.
  const [visibleCols, setVisibleCols] = useState(() => new Set(colKeys));
  const [widths, setWidths] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [detailLead, setDetailLead] = useState(null);

  // Reconcile the visible set when columns are added/removed in the config:
  // brand-new columns show by default; removed columns drop out. Deselections
  // the user made are preserved.
  const seenKeysRef = useRef(new Set(colKeys));
  useEffect(() => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      for (const k of colKeys) {
        if (!seenKeysRef.current.has(k)) next.add(k); // new column
      }
      for (const k of [...next]) {
        if (!colKeys.includes(k)) next.delete(k); // removed column
      }
      seenKeysRef.current = new Set(colKeys);
      return next;
    });
  }, [colKeys]);

  // Reset selection/expansion when the viewer (role) changes.
  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedId(null);
    if (isBDM) return;
    // DSCs never filter/select by DSC.
    setFilters((f) => ({ ...f, assignedDscId: [] }));
  }, [viewerId, isBDM]);

  function handleFilterChange(key, values) {
    setFilters((f) => ({ ...f, [key]: values }));
  }
  function clearAllFilters() {
    setFilters(EMPTY_FILTERS);
    setDatePreset("");
  }
  function handleSort(key) {
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  }
  function handleResize(key, w) {
    setWidths((prev) => ({ ...prev, [key]: w }));
  }

  // ---- Role scoping: DSC sees only their own leads -------------------------
  const roleScoped = useMemo(
    () =>
      isBDM ? allLeads : allLeads.filter((l) => l.assignedDscId === viewerId),
    [allLeads, isBDM, viewerId]
  );

  const cityOptions = useMemo(
    () =>
      Array.from(new Set(roleScoped.map((l) => l.city).filter(Boolean))).sort(),
    [roleScoped]
  );

  const filterOptions = {
    leadStatus: LEAD_STATUSES,
    priority: PRIORITIES,
    industry: INDUSTRIES,
    city: cityOptions,
    // "Unassigned" first so the BDM can find freshly imported leads.
    assignedDscId: [
      { value: "", label: "Unassigned" },
      ...DSCS.map((d) => ({ value: d.id, label: d.name })),
    ],
    leadSource: LEAD_SOURCES,
  };

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleCols.has(c.key)),
    [columns, visibleCols]
  );

  // ---- Search + filter + sort ----------------------------------------------
  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = roleScoped.filter((lead) => {
      for (const key of Object.keys(EMPTY_FILTERS)) {
        const sel = filters[key];
        if (sel.length > 0 && !sel.includes(lead[key])) return false;
      }
      if (!matchesDatePreset(lead.nextFollowUpDate, datePreset)) return false;
      if (q) {
        const hay = searchKeys
          .map((k) => lead[k])
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort.key) {
      const col = colByKey[sort.key];
      if (col)
        rows = [...rows].sort((a, b) => compareLeads(a, b, col, sort.dir));
    }
    return rows;
  }, [roleScoped, search, filters, datePreset, sort, searchKeys, colByKey]);

  // ---- Selection (BDM) -----------------------------------------------------
  const allSelected =
    visibleLeads.length > 0 &&
    visibleLeads.every((l) => selectedIds.has(l.leadId));

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleLeads.forEach((l) => next.delete(l.leadId));
      else visibleLeads.forEach((l) => next.add(l.leadId));
      return next;
    });
  }

  // ---- Mutations -----------------------------------------------------------
  function handleFieldChange(leadId, patch) {
    setAllLeads((rows) =>
      rows.map((l) => (l.leadId === leadId ? { ...l, ...patch } : l))
    );
    // Keep the open sidebar's controlled fields in sync with the edit.
    setDetailLead((d) => (d && d.leadId === leadId ? { ...d, ...patch } : d));
    updateLead(leadId, patch).catch((e) => console.error(e));
  }

  function handleBulkAssign(dscId) {
    const ids = [...selectedIds];
    setAllLeads((rows) =>
      rows.map((l) =>
        selectedIds.has(l.leadId) ? { ...l, assignedDscId: dscId } : l
      )
    );
    assignLeads(ids, dscId).catch((e) => console.error(e));
    setSelectedIds(new Set());
  }

  function handleImported(newLeads) {
    // Prepend so freshly imported (New, unassigned) leads are visible up top.
    setAllLeads((rows) => [...newLeads, ...rows]);
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Lead Table"
        subtitle={
          isBDM ? "All leads across the team" : `${viewer?.name}'s leads`
        }
        right={<RoleSwitcher viewerId={viewerId} onChange={setViewerId} />}
      />

      <LeadToolbar
        search={search}
        onSearch={setSearch}
        count={visibleLeads.length}
        total={roleScoped.length}
        filters={filters}
        onFilterChange={handleFilterChange}
        datePreset={datePreset}
        onDatePreset={setDatePreset}
        onClearAll={clearAllFilters}
        options={filterOptions}
        visibleColumns={visibleCols}
        onColumnsChange={setVisibleCols}
        columnGroups={groups}
        columnKeys={colKeys}
        showDscFilter={isBDM}
        canImport={isBDM}
        onImport={() => setImportOpen(true)}
      />

      {isBDM ? (
        <BulkAssignBar
          count={selectedIds.size}
          onAssign={handleBulkAssign}
          onClear={() => setSelectedIds(new Set())}
        />
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading leads…
          </div>
        ) : (
          <LeadTable
            leads={visibleLeads}
            columns={visibleColumns}
            widths={widths}
            onResize={handleResize}
            sortBy={sort.key}
            sortDir={sort.dir}
            onSort={handleSort}
            selectable={isBDM}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            allSelected={allSelected}
            expandedId={expandedId}
            onToggleExpand={(id) =>
              setExpandedId((cur) => (cur === id ? null : id))
            }
            renderExpanded={(lead) => (
              <ExpandedLeadRow
                lead={lead}
                role={viewer?.role}
                onChange={handleFieldChange}
                groups={groups}
              />
            )}
            onOpenDetail={setDetailLead}
          />
        )}
      </div>

      <LeadDetailSidebar
        lead={detailLead}
        role={viewer?.role}
        groups={groups}
        onChange={handleFieldChange}
        onClose={() => setDetailLead(null)}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingLeads={allLeads}
        onImported={handleImported}
        importCols={importCols}
      />
    </div>
  );
}
