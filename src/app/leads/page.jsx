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
import WinRequestModal from "@/components/leads/WinRequestModal";
import AnalyticsPanel from "@/components/analytics/AnalyticsPanel";
import { useCompConfig } from "@/lib/compConfig";
import { personAnalytics, teamAnalytics, isActive } from "@/lib/analytics";
import { greetingFor, thoughtOfTheDay } from "@/lib/greeting";
import {
  allKeys,
  searchableKeys,
  importColumns,
  groupsOf,
  byKey,
} from "@/components/leads/columns";
import { useColumnConfig } from "@/lib/columnConfig";
import { useActiveDscs, useUsers } from "@/lib/usersConfig";
import { getLeads, updateLead, assignLeads, requestWin } from "@/lib/leadsApi";
import {
  discountPct,
  recentMonths,
  monthKeyOf,
  isoInRange,
} from "@/lib/format";
import {
  LEAD_STATUSES,
  PRIORITIES,
  INDUSTRIES,
  LEAD_SOURCES,
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

const PAGE_SIZE = 20; // rows per page in the lead table

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

// ---- Follow-up date range (calendar filter) --------------------------------
// True when `iso` (a lead's follow-up date) is within [from, to] inclusive.
// Both empty = no filter (all leads). A single day = from == to.
function inDateRange(iso, from, to) {
  if (!from && !to) return true;
  return isoInRange(iso, from, to);
}

export default function LeadsPage() {
  // ---- Team (managed by Admin in User Management) --------------------------
  const dscs = useActiveDscs();
  const { users } = useUsers();

  // ---- Role (demo switcher; real auth replaces this) -----------------------
  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = users.find((u) => u.id === viewerId) || USER_BY_ID[viewerId];
  const isAdmin = viewer?.role === "admin";
  const isBDM = viewer?.role === "bdm";
  // Admin and BDM both see the whole team + can import / (bulk-)assign.
  const isManager = isBDM || isAdmin;

  // ---- Manager focus: "team" | "self" (BDM's own) | a DSC id ----------------
  // A manager can focus the whole screen (analytics + leads) on the team, their
  // own leads, or one DSC. Focusing a DSC is view-only (see permission model).
  const [focus, setFocus] = useState("team");
  useEffect(() => {
    // Reset focus when the viewer changes: BDM lands on their own leads, Admin
    // on the whole team.
    setFocus(viewer?.role === "bdm" ? "self" : "team");
  }, [viewerId, viewer?.role]);
  // Focus only applies to managers; a DSC always sees their own leads.
  const effFocus = isManager ? focus : "self";
  const focusDsc =
    effFocus !== "team" && effFocus !== "self"
      ? dscs.find((d) => d.id === effFocus)
      : null;
  const focusIsDsc = !!focusDsc;

  // If the focused DSC is deactivated (drops out of the active list), fall back
  // to the team view instead of silently showing the manager's own leads.
  useEffect(() => {
    if (isManager && focus !== "team" && focus !== "self" && !focusDsc) {
      setFocus("team");
    }
  }, [isManager, focus, focusDsc]);

  const { config } = useCompConfig();
  const [showAnalytics, setShowAnalytics] = useState(true);
  // Month filter for the analytics (default = current month; last 6 selectable).
  const monthOptions = useMemo(() => recentMonths(6), []);
  const [analyticsMonth, setAnalyticsMonth] = useState(() => monthKeyOf());

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
  const [dateFrom, setDateFrom] = useState(""); // follow-up range (calendar)
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null });
  // All columns are visible by default.
  const [visibleCols, setVisibleCols] = useState(() => new Set(colKeys));
  const [widths, setWidths] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [winRequestLead, setWinRequestLead] = useState(null);
  // Pagination — keeps the table a bounded height so it stays usable under the
  // analytics panel.
  const [page, setPage] = useState(1);

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

  // If the current demo viewer gets deactivated in User Management, fall back to
  // the first person who can still log in (mirrors losing portal access).
  useEffect(() => {
    const active = users.filter((u) => u.status !== "deactivated");
    if (active.length && !active.some((u) => u.id === viewerId)) {
      setViewerId(active[0].id);
    }
  }, [users, viewerId]);

  // Reset selection/expansion when the viewer (role) changes.
  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedId(null);
  }, [viewerId, isManager]);

  // The DSC filter only shows in team focus. Drop any DSC selection when it's
  // hidden (a DSC viewer, or a manager focused on self / a single DSC), so it
  // can't silently narrow the table with no visible control or chip to clear it.
  useEffect(() => {
    if (effFocus !== "team") {
      setFilters((f) =>
        f.assignedDscId.length ? { ...f, assignedDscId: [] } : f
      );
    }
  }, [effFocus]);

  function handleFilterChange(key, values) {
    setFilters((f) => ({ ...f, [key]: values }));
  }
  function clearAllFilters() {
    setFilters(EMPTY_FILTERS);
    setDateFrom("");
    setDateTo("");
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

  // ---- Scoping by focus ----------------------------------------------------
  // Which leads the screen shows, and whose analytics: the whole team, the
  // manager's own leads ("self"), or one DSC's leads.
  const scopeUserId =
    effFocus === "team" ? null : focusIsDsc ? effFocus : viewerId;
  const roleScoped = useMemo(() => {
    if (effFocus === "team") return allLeads; // manager, whole team
    return allLeads.filter((l) => l.assignedDscId === scopeUserId);
  }, [allLeads, effFocus, scopeUserId]);

  // Analytics for the current focus, scoped to the selected month.
  const analytics = useMemo(() => {
    if (!viewer) return null;
    if (effFocus === "team") {
      return {
        variant: "team",
        name: viewer.name,
        self: false,
        data: teamAnalytics(allLeads, dscs, config, viewer, analyticsMonth),
      };
    }
    if (focusIsDsc) {
      return {
        variant: "dsc",
        name: focusDsc.name,
        self: false,
        data: personAnalytics(
          focusDsc,
          allLeads,
          config,
          analyticsMonth,
          "dsc"
        ),
      };
    }
    // "self" — the viewer's own leads (DSC, or a BDM viewing "My leads").
    return {
      variant: "dsc",
      name: viewer.name,
      self: true,
      data: personAnalytics(
        viewer,
        allLeads,
        config,
        analyticsMonth,
        viewer.role === "bdm" ? "bdm" : "dsc"
      ),
    };
  }, [
    viewer,
    effFocus,
    focusIsDsc,
    focusDsc,
    allLeads,
    dscs,
    config,
    analyticsMonth,
  ]);

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
      ...dscs.map((d) => ({ value: d.id, label: d.name })),
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
      if (!inDateRange(lead.nextFollowUpDate, dateFrom, dateTo)) return false;
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
    } else {
      // Default: newest-assigned leads on top.
      rows = [...rows].sort((a, b) =>
        (b.assignedDate || "").localeCompare(a.assignedDate || "")
      );
    }
    return rows;
  }, [
    roleScoped,
    search,
    filters,
    dateFrom,
    dateTo,
    sort,
    searchKeys,
    colByKey,
  ]);

  // ---- Pagination ----------------------------------------------------------
  const pageCount = Math.max(1, Math.ceil(visibleLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedLeads = useMemo(
    () =>
      visibleLeads.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [visibleLeads, currentPage]
  );
  // Back to page 1 whenever the result set changes.
  useEffect(() => {
    setPage(1);
  }, [search, filters, dateFrom, dateTo, sort, viewerId, effFocus]);

  // ---- Lead edit permissions (by role + focus) -----------------------------
  // Who may edit a lead's FIELDS (not the assignee):
  //   - a DSC edits their own leads
  //   - a manager (BDM/Admin) edits only UNASSIGNED leads or leads assigned to
  //     THEMSELVES; a lead assigned to a DSC is view-only
  //   - focusing on a DSC is always view-only
  // Who may (re)assign a lead: a manager, when not focused on a specific DSC.
  function canEditLead(lead) {
    if (!isManager) return lead?.assignedDscId === viewerId; // DSC: own leads
    if (focusIsDsc) return false; // viewing a DSC's book — read-only
    return lead?.assignedDscId === "" || lead?.assignedDscId === viewerId;
  }
  const canReassign = isManager && !focusIsDsc;

  const rangeStart = visibleLeads.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, visibleLeads.length);

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
    // Enforce the permission model (defense-in-depth; the UI also disables it):
    // a reassignment (assignedDscId only) needs reassign rights; any other field
    // edit needs edit rights on that lead.
    const lead = allLeads.find((l) => l.leadId === leadId);
    const keys = Object.keys(patch);
    const isReassignOnly = keys.length === 1 && keys[0] === "assignedDscId";
    if (isReassignOnly ? !canReassign : !canEditLead(lead)) return;

    setAllLeads((rows) =>
      rows.map((l) => (l.leadId === leadId ? { ...l, ...patch } : l))
    );
    // Keep the open sidebar's controlled fields in sync with the edit.
    setDetailLead((d) => (d && d.leadId === leadId ? { ...d, ...patch } : d));
    updateLead(leadId, patch).catch((e) => console.error(e));
  }

  // A close request: the owner submits line items + quoted; the deal goes to
  // "pending" (not yet Project Started) until the Admin approves on /approvals.
  function handleRequestWin(payload) {
    const leadId = winRequestLead?.leadId;
    if (!leadId) return;
    const patch = {
      approvalStatus: "pending",
      approvalRequest: payload,
      approvalReason: "",
    };
    setAllLeads((rows) =>
      rows.map((l) => (l.leadId === leadId ? { ...l, ...patch } : l))
    );
    setDetailLead((d) => (d && d.leadId === leadId ? { ...d, ...patch } : d));
    requestWin(leadId, payload).catch((e) => console.error(e));
    setWinRequestLead(null);
  }

  // Who may raise a close request: whoever may edit the lead, when it's an active
  // deal that isn't already pending/won.
  function canRequestWin(lead) {
    return (
      !!lead &&
      canEditLead(lead) &&
      isActive(lead.leadStatus) &&
      lead.approvalStatus !== "pending"
    );
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

  const focusSubtitle = focusIsDsc
    ? `Viewing ${focusDsc.name}'s leads (read-only)`
    : effFocus === "self"
      ? `${viewer?.name}'s leads`
      : "All leads across the team";

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Lead Table"
        subtitle={focusSubtitle}
        right={
          <div className="flex items-center gap-3">
            {isManager ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="hidden sm:inline">Focus</span>
                <select
                  value={effFocus}
                  onChange={(e) => setFocus(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="team">All team</option>
                  {isBDM ? <option value="self">My leads</option> : null}
                  {dscs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <RoleSwitcher viewerId={viewerId} onChange={setViewerId} />
          </div>
        }
      />

      {/* Single vertical scroll: greeting → performance → sticky toolbar →
          table → pager. Scrolling reveals the full table even with the
          performance panel open. */}
      <div className="flex-1 overflow-y-auto">
        {viewer ? (
          <div className="border-b border-slate-200 bg-white px-6 py-3">
            <div className="text-sm text-slate-500">
              {greetingFor()},{" "}
              <span className="font-semibold text-slate-800">
                {viewer.name}
              </span>{" "}
              👋
            </div>
            <div className="mt-0.5 text-sm italic text-slate-600">
              “{thoughtOfTheDay(viewer.id)}”
            </div>
          </div>
        ) : null}

        {analytics && !loading ? (
          <AnalyticsPanel
            variant={analytics.variant}
            dscName={analytics.name}
            self={analytics.self}
            data={analytics.data}
            collapsed={!showAnalytics}
            onToggle={() => setShowAnalytics((s) => !s)}
            month={analyticsMonth}
            months={monthOptions}
            onMonthChange={setAnalyticsMonth}
          />
        ) : null}

        <div className="sticky top-0 z-20 bg-white shadow-sm">
          <LeadToolbar
            search={search}
            onSearch={setSearch}
            count={visibleLeads.length}
            total={roleScoped.length}
            filters={filters}
            onFilterChange={handleFilterChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFrom={setDateFrom}
            onDateTo={setDateTo}
            onClearAll={clearAllFilters}
            options={filterOptions}
            visibleColumns={visibleCols}
            onColumnsChange={setVisibleCols}
            columnGroups={groups}
            columnKeys={colKeys}
            showDscFilter={isManager && effFocus === "team"}
            canImport={isManager}
            onImport={() => setImportOpen(true)}
          />
          {canReassign ? (
            <BulkAssignBar
              count={selectedIds.size}
              onAssign={handleBulkAssign}
              onClear={() => setSelectedIds(new Set())}
            />
          ) : null}
        </div>

        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading leads…
          </div>
        ) : (
          <>
            <LeadTable
              leads={pagedLeads}
              columns={visibleColumns}
              widths={widths}
              onResize={handleResize}
              sortBy={sort.key}
              sortDir={sort.dir}
              onSort={handleSort}
              selectable={canReassign}
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
                  canEdit={canEditLead(lead)}
                  canAssign={canReassign}
                  onChange={handleFieldChange}
                  groups={groups}
                />
              )}
              onOpenDetail={setDetailLead}
            />

            {/* Pager */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-2.5 text-sm">
              <span className="text-slate-500">
                {visibleLeads.length === 0 ? (
                  "No leads"
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {rangeStart}–{rangeEnd}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {visibleLeads.length}
                    </span>{" "}
                    leads
                  </>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <LeadDetailSidebar
        lead={detailLead}
        canEdit={detailLead ? canEditLead(detailLead) : false}
        canAssign={canReassign}
        groups={groups}
        onChange={handleFieldChange}
        onClose={() => setDetailLead(null)}
        canRequestWin={detailLead ? canRequestWin(detailLead) : false}
        onRequestWin={(lead) => setWinRequestLead(lead)}
      />

      <WinRequestModal
        open={!!winRequestLead}
        lead={winRequestLead}
        requestedBy={viewerId}
        today={monthKeyOf() + "-15"}
        onSubmit={handleRequestWin}
        onClose={() => setWinRequestLead(null)}
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
