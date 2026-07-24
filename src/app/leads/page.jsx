"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import LeadToolbar from "@/components/leads/LeadToolbar";
import LeadTable from "@/components/leads/LeadTable";
import LeadDealsPanel from "@/components/leads/LeadDealsPanel";
import LeadDetailSidebar from "@/components/leads/LeadDetailSidebar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import BulkAssignBar from "@/components/leads/BulkAssignBar";
import ImportModal from "@/components/leads/ImportModal";
import CreateDealModal from "@/components/leads/CreateDealModal";
import DealTable from "@/components/deals/DealTable";
import DealFilters from "@/components/deals/DealFilters";
import DealDetailSidebar from "@/components/pipeline/DealDetailSidebar";
import DealWinRequestModal from "@/components/pipeline/DealWinRequestModal";
import AnalyticsPanel from "@/components/analytics/AnalyticsPanel";
import { useCompConfig } from "@/lib/compConfig";
import { personAnalytics, teamAnalytics } from "@/lib/analytics";
import { useDeals } from "@/lib/useDeals";
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
import { getLeads, updateLead, assignLeads } from "@/lib/leadsApi";
import { createDeal } from "@/lib/dealsApi";
import {
  discountPct,
  recentMonths,
  monthKeyOf,
  isoInRange,
} from "@/lib/format";
import {
  LEAD_STATUSES,
  DEAL_STATUSES,
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

const EMPTY_DEAL_FILTERS = {
  dealStatus: [],
  ownerId: [],
  offeringKind: [],
  approvalStatus: [],
};

const PAGE_SIZE = 20; // rows per page in either table

// ---- Sorting ---------------------------------------------------------------
function compareNumbers(a, b, factor) {
  const an = a === null || a === undefined || a === "" ? null : Number(a);
  const bn = b === null || b === undefined || b === "" ? null : Number(b);
  if (an === null && bn === null) return 0;
  if (an === null) return 1;
  if (bn === null) return -1;
  return (an - bn) * factor;
}

function compareText(a, b, factor) {
  const av = (a ?? "").toString().toLowerCase();
  const bv = (b ?? "").toString().toLowerCase();
  if (av === bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av < bv ? -1 * factor : 1 * factor;
}

function compareDate(a, b, factor) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return (a < b ? -1 : a > b ? 1 : 0) * factor;
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
    case "date":
      return compareDate(a[key], b[key], factor);
    default:
      return compareText(a[key], b[key], factor);
  }
}

// Sort two deals by a DealTable column key (deal-native fields).
function compareDeals(a, b, key, dir) {
  const factor = dir === "asc" ? 1 : -1;
  switch (key) {
    case "quotedAmount":
    case "closedAmount":
      return compareNumbers(a[key], b[key], factor);
    case "discount":
      return compareNumbers(discountPct(a), discountPct(b), factor);
    case "createdDate":
      return compareDate(a.createdDate, b.createdDate, factor);
    case "dealStatus":
      return (
        (DEAL_STATUSES.indexOf(a.dealStatus) -
          DEAL_STATUSES.indexOf(b.dealStatus)) *
        factor
      );
    case "ownerId":
      return dscName(a.ownerId).localeCompare(dscName(b.ownerId)) * factor;
    case "approval":
      return compareText(a.approvalStatus, b.approvalStatus, factor);
    default:
      return compareText(a[key], b[key], factor);
  }
}

// True when `iso` is within [from, to] inclusive; empty bounds = no filter.
function inDateRange(iso, from, to) {
  if (!from && !to) return true;
  return isoInRange(iso, from, to);
}

export default function LeadsPage() {
  // ---- Team (managed by Admin in User Management) --------------------------
  const dscs = useActiveDscs();
  const { users } = useUsers();
  const { config } = useCompConfig();

  // ---- Role (demo switcher; real auth replaces this) -----------------------
  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = users.find((u) => u.id === viewerId) || USER_BY_ID[viewerId];
  const isAdmin = viewer?.role === "admin";
  const isBDM = viewer?.role === "bdm";
  const isManager = isBDM || isAdmin;

  // ---- View: prospect leads, or the flat deals table -----------------------
  const [view, setView] = useState("leads"); // "leads" | "deals"

  // ---- Manager focus: "team" | "self" (BDM's own) | a DSC id ----------------
  const [focus, setFocus] = useState("team");
  useEffect(() => {
    setFocus(viewer?.role === "bdm" ? "self" : "team");
  }, [viewerId, viewer?.role]);
  const effFocus = isManager ? focus : "self";
  const focusDsc =
    effFocus !== "team" && effFocus !== "self"
      ? dscs.find((d) => d.id === effFocus)
      : null;
  const focusIsDsc = !!focusDsc;

  useEffect(() => {
    if (isManager && focus !== "team" && focus !== "self" && !focusDsc) {
      setFocus("team");
    }
  }, [isManager, focus, focusDsc]);

  const [showAnalytics, setShowAnalytics] = useState(true);
  const monthOptions = useMemo(() => recentMonths(6), []);
  const [analyticsMonth, setAnalyticsMonth] = useState(() => monthKeyOf());

  // ---- Editable column config (labels, aliases, add/remove) ----------------
  const { columns } = useColumnConfig();
  const colKeys = useMemo(() => allKeys(columns), [columns]);
  const searchKeys = useMemo(() => searchableKeys(columns), [columns]);
  const importCols = useMemo(() => importColumns(columns), [columns]);
  const groups = useMemo(() => groupsOf(columns), [columns]);
  const colByKey = useMemo(() => byKey(columns), [columns]);

  // ---- Lead data (the page owns it; import/assign/edit mutate it) ----------
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

  // ---- Deal data + actions (shared hook; also used by the Pipeline) --------
  const dealsApi = useDeals({ viewerId, isManager, focusIsDsc, config });
  const deals = dealsApi.deals;

  // ---- Lead controls -------------------------------------------------------
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null });
  const [visibleCols, setVisibleCols] = useState(() => new Set(colKeys));
  const [widths, setWidths] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [createDealLead, setCreateDealLead] = useState(null);
  const [page, setPage] = useState(1);

  // ---- Deal-view controls --------------------------------------------------
  const [dealSearch, setDealSearch] = useState("");
  const [dealFilters, setDealFilters] = useState(EMPTY_DEAL_FILTERS);
  const [dealSort, setDealSort] = useState({ key: null, dir: null });
  const [dealPage, setDealPage] = useState(1);

  // Reconcile the visible column set when columns are added/removed.
  const seenKeysRef = useRef(new Set(colKeys));
  useEffect(() => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      for (const k of colKeys) {
        if (!seenKeysRef.current.has(k)) next.add(k);
      }
      for (const k of [...next]) {
        if (!colKeys.includes(k)) next.delete(k);
      }
      seenKeysRef.current = new Set(colKeys);
      return next;
    });
  }, [colKeys]);

  useEffect(() => {
    const active = users.filter((u) => u.status !== "deactivated");
    if (active.length && !active.some((u) => u.id === viewerId)) {
      setViewerId(active[0].id);
    }
  }, [users, viewerId]);

  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedId(null);
  }, [viewerId, isManager]);

  // The DSC/Owner filters only show in team focus. Drop them when hidden.
  useEffect(() => {
    if (effFocus !== "team") {
      setFilters((f) =>
        f.assignedDscId.length ? { ...f, assignedDscId: [] } : f
      );
      setDealFilters((f) => (f.ownerId.length ? { ...f, ownerId: [] } : f));
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
  function handleDealFilterChange(key, values) {
    setDealFilters((f) => ({ ...f, [key]: values }));
  }
  function clearDealFilters() {
    setDealFilters(EMPTY_DEAL_FILTERS);
    setDealSearch("");
  }
  function handleDealSort(key) {
    setDealSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  }

  // ---- Scoping by focus ----------------------------------------------------
  const scopeUserId =
    effFocus === "team" ? null : focusIsDsc ? effFocus : viewerId;
  const roleScoped = useMemo(() => {
    if (effFocus === "team") return allLeads;
    return allLeads.filter((l) => l.assignedDscId === scopeUserId);
  }, [allLeads, effFocus, scopeUserId]);
  const roleScopedDeals = useMemo(() => {
    if (effFocus === "team") return deals;
    return deals.filter((d) => d.ownerId === scopeUserId);
  }, [deals, effFocus, scopeUserId]);

  // Deals grouped by lead id — for the lead-view row expansion.
  const dealsByLead = useMemo(() => {
    const map = {};
    for (const d of deals) (map[d.leadId] ||= []).push(d);
    return map;
  }, [deals]);

  // Analytics for the current focus, scoped to the selected month.
  const analytics = useMemo(() => {
    if (!viewer) return null;
    if (effFocus === "team") {
      return {
        variant: "team",
        name: viewer.name,
        self: false,
        data: teamAnalytics(
          allLeads,
          deals,
          dscs,
          config,
          viewer,
          analyticsMonth
        ),
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
          deals,
          config,
          analyticsMonth,
          "dsc"
        ),
      };
    }
    return {
      variant: "dsc",
      name: viewer.name,
      self: true,
      data: personAnalytics(
        viewer,
        allLeads,
        deals,
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
    deals,
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
    assignedDscId: [
      { value: "", label: "Unassigned" },
      ...dscs.map((d) => ({ value: d.id, label: d.name })),
    ],
    leadSource: LEAD_SOURCES,
  };

  const dealFilterOptions = {
    dealStatus: DEAL_STATUSES,
    ownerId: [
      { value: "", label: "Unassigned" },
      ...dscs.map((d) => ({ value: d.id, label: d.name })),
    ],
    offeringKind: ["service", "product"],
    approvalStatus: ["pending", "approved", "rejected"],
  };

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleCols.has(c.key)),
    [columns, visibleCols]
  );

  // ---- Lead search + filter + sort -----------------------------------------
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

  // ---- Deal search + filter + sort -----------------------------------------
  const visibleDeals = useMemo(() => {
    const q = dealSearch.trim().toLowerCase();
    let rows = roleScopedDeals.filter((d) => {
      if (
        dealFilters.dealStatus.length &&
        !dealFilters.dealStatus.includes(d.dealStatus)
      )
        return false;
      if (
        dealFilters.ownerId.length &&
        !dealFilters.ownerId.includes(d.ownerId)
      )
        return false;
      if (
        dealFilters.offeringKind.length &&
        !dealFilters.offeringKind.includes(d.offeringKind)
      )
        return false;
      if (
        dealFilters.approvalStatus.length &&
        !dealFilters.approvalStatus.includes(d.approvalStatus)
      )
        return false;
      if (q && !`${d.company} ${d.offeringName}`.toLowerCase().includes(q))
        return false;
      return true;
    });
    if (dealSort.key) {
      rows = [...rows].sort((a, b) =>
        compareDeals(a, b, dealSort.key, dealSort.dir)
      );
    } else {
      rows = [...rows].sort((a, b) =>
        (b.createdDate || "").localeCompare(a.createdDate || "")
      );
    }
    return rows;
  }, [roleScopedDeals, dealSearch, dealFilters, dealSort]);

  // ---- Pagination (per view) -----------------------------------------------
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
  const dealPageCount = Math.max(1, Math.ceil(visibleDeals.length / PAGE_SIZE));
  const currentDealPage = Math.min(dealPage, dealPageCount);
  const pagedDeals = useMemo(
    () =>
      visibleDeals.slice(
        (currentDealPage - 1) * PAGE_SIZE,
        currentDealPage * PAGE_SIZE
      ),
    [visibleDeals, currentDealPage]
  );
  useEffect(() => {
    setPage(1);
  }, [search, filters, dateFrom, dateTo, sort, viewerId, effFocus]);
  useEffect(() => {
    setDealPage(1);
  }, [dealSearch, dealFilters, dealSort, viewerId, effFocus]);

  // ---- Lead edit permissions (by role + focus) -----------------------------
  function canEditLead(lead) {
    if (!isManager) return lead?.assignedDscId === viewerId;
    if (focusIsDsc) return false;
    return lead?.assignedDscId === "" || lead?.assignedDscId === viewerId;
  }
  const canReassign = isManager && !focusIsDsc;

  const rangeStart = visibleLeads.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, visibleLeads.length);
  const dealRangeStart = visibleDeals.length
    ? (currentDealPage - 1) * PAGE_SIZE + 1
    : 0;
  const dealRangeEnd = Math.min(
    currentDealPage * PAGE_SIZE,
    visibleDeals.length
  );

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

  // ---- Lead mutations ------------------------------------------------------
  function handleFieldChange(leadId, patch) {
    const lead = allLeads.find((l) => l.leadId === leadId);
    const keys = Object.keys(patch);
    const isReassignOnly = keys.length === 1 && keys[0] === "assignedDscId";
    if (isReassignOnly ? !canReassign : !canEditLead(lead)) return;
    setAllLeads((rows) =>
      rows.map((l) => (l.leadId === leadId ? { ...l, ...patch } : l))
    );
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
    setAllLeads((rows) => [...newLeads, ...rows]);
  }

  // ---- Lead → Deal: deal creation from Services Interested -----------------
  // The active catalog offerings, keyed by their display name so we can match a
  // lead's Services Interested (which stores service NAMES) to offerings.
  const catalogOfferings = useMemo(
    () =>
      [...(config.services || []), ...(config.products || [])]
        .filter((o) => o.active)
        .map((o) => ({ id: o.id, name: o.name, kind: o.kind })),
    [config]
  );

  // The offerings a deal can be created for = the lead's Services Interested that
  // map to an active catalog offering. This is what the create-deal dropdown shows.
  function interestedOfferingsFor(lead) {
    const names = new Set(lead?.servicesInterested || []);
    return catalogOfferings.filter((o) => names.has(o.name));
  }

  const canManageDeals = detailLead ? canEditLead(detailLead) : false;

  // Create one deal (one offering) under the lead from the modal.
  function submitCreateDeal({ offeringId, quotedAmount, closedAmount, note }) {
    const lead = createDealLead;
    if (!lead) return;
    const owner = viewer?.role === "dsc" ? viewer.id : lead.assignedDscId || "";
    createDeal({
      leadId: lead.leadId,
      companyId: lead.companyId,
      offeringId,
      ownerId: owner,
      dealStatus: "Open",
      quotedAmount,
      closedAmount: closedAmount ?? null,
      createdDate: monthKeyOf() + "-15",
      notes: note || "",
    })
      .then(() => dealsApi.reload())
      .catch((e) => console.error(e));
    setCreateDealLead(null);
  }

  const focusSubtitle = focusIsDsc
    ? `Viewing ${focusDsc.name}'s ${view} (read-only)`
    : effFocus === "self"
      ? `${viewer?.name}'s ${view}`
      : `All ${view} across the team`;

  const leadsView = view === "leads";

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
          {/* Lead ⇄ Deal view switch */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-2">
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5">
              {[
                { key: "leads", label: "Leads" },
                { key: "deals", label: "Deals" },
              ].map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    view === v.key
                      ? "bg-brand text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">
              {leadsView
                ? "Prospects — expand a row to see its deals"
                : "Every deal (one offering each) with its status"}
            </span>
          </div>

          {leadsView ? (
            <>
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
            </>
          ) : (
            <DealFilters
              search={dealSearch}
              onSearch={setDealSearch}
              count={visibleDeals.length}
              total={roleScopedDeals.length}
              filters={dealFilters}
              onFilterChange={handleDealFilterChange}
              options={dealFilterOptions}
              showOwnerFilter={isManager && effFocus === "team"}
              onClearAll={clearDealFilters}
            />
          )}
        </div>

        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : leadsView ? (
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
                <LeadDealsPanel
                  lead={lead}
                  deals={dealsByLead[lead.leadId] || []}
                  canManageDeals={canEditLead(lead)}
                  canCreateDeal={interestedOfferingsFor(lead).length > 0}
                  onCreateDeal={(l) => setCreateDealLead(l)}
                  onOpenDeal={(deal) => dealsApi.setDetailDeal(deal)}
                  onOpenFull={(l) => setDetailLead(l)}
                />
              )}
              onOpenDetail={setDetailLead}
            />

            <Pager
              start={rangeStart}
              end={rangeEnd}
              total={visibleLeads.length}
              noun="leads"
              page={currentPage}
              pageCount={pageCount}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
            />
          </>
        ) : (
          <>
            <DealTable
              deals={pagedDeals}
              sortBy={dealSort.key}
              sortDir={dealSort.dir}
              onSort={handleDealSort}
              onOpen={(deal) => dealsApi.setDetailDeal(deal)}
            />
            <Pager
              start={dealRangeStart}
              end={dealRangeEnd}
              total={visibleDeals.length}
              noun="deals"
              page={currentDealPage}
              pageCount={dealPageCount}
              onPrev={() => setDealPage((p) => Math.max(1, p - 1))}
              onNext={() => setDealPage((p) => Math.min(dealPageCount, p + 1))}
            />
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
        deals={dealsByLead[detailLead?.leadId] || []}
        canManageDeals={canManageDeals}
        canCreateDeal={
          detailLead ? interestedOfferingsFor(detailLead).length > 0 : false
        }
        onCreateDeal={(lead) => setCreateDealLead(lead)}
        onOpenDeal={(deal) => dealsApi.setDetailDeal(deal)}
      />

      <DealDetailSidebar
        deal={dealsApi.detailDeal}
        config={config}
        canEditStatus={dealsApi.canEditDeal(dealsApi.detailDeal)}
        canEditAmounts={dealsApi.canEditAmounts(dealsApi.detailDeal)}
        canRequestWin={dealsApi.canRequestWin(dealsApi.detailDeal)}
        onChangeStatus={dealsApi.moveDeal}
        onChangeField={dealsApi.editDeal}
        onRequestWin={(deal) =>
          dealsApi.openWinRequest(deal, "Project Started")
        }
        onOpenLead={(leadId) => {
          const lead = allLeads.find((l) => l.leadId === leadId);
          if (lead) {
            dealsApi.setDetailDeal(null);
            setDetailLead(lead);
          }
        }}
        onClose={() => dealsApi.setDetailDeal(null)}
      />

      <DealWinRequestModal
        open={!!dealsApi.winDeal}
        deal={dealsApi.winDeal}
        toStatus={dealsApi.winToStatus}
        requestedBy={viewerId}
        today={monthKeyOf() + "-15"}
        onSubmit={dealsApi.submitWinRequest}
        onClose={dealsApi.closeWinRequest}
      />

      <CreateDealModal
        open={!!createDealLead}
        lead={createDealLead}
        offerings={createDealLead ? interestedOfferingsFor(createDealLead) : []}
        onSubmit={submitCreateDeal}
        onClose={() => setCreateDealLead(null)}
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

// Shared pager for both tables.
function Pager({ start, end, total, noun, page, pageCount, onPrev, onNext }) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-2.5 text-sm">
      <span className="text-slate-500">
        {total === 0 ? (
          `No ${noun}`
        ) : (
          <>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {start}–{end}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{total}</span>{" "}
            {noun}
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
