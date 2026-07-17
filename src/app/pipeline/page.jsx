"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import PipelineToolbar from "@/components/pipeline/PipelineToolbar";
import LeadDetailSidebar from "@/components/leads/LeadDetailSidebar";
import { getLeads, updateLead } from "@/lib/leadsApi";
import {
  USER_BY_ID,
  PRIORITIES,
  INDUSTRIES,
  LEAD_SOURCES,
} from "@/data/mockLeads";
import { useColumnConfig } from "@/lib/columnConfig";
import { useActiveDscs, useUsers } from "@/lib/usersConfig";
import { groupsOf } from "@/components/leads/columns";
import { isWon, isActive, leadInPeriod } from "@/lib/analytics";
import {
  monthRange,
  recentMonths,
  monthKeyOf,
  isOnOrBefore,
} from "@/lib/format";

const EMPTY_FILTERS = {
  priority: [],
  industry: [],
  city: [],
  leadSource: [],
  assignedDscId: [],
};
const SEARCH_KEYS = [
  "company",
  "contactPerson",
  "email",
  "phone",
  "leadId",
  "city",
];

// Pipeline / Kanban board (Build Brief §3 step 2). Drag a lead card between
// status columns — or use the card's status select — to change its status.
// Mirrors the Lead Table's role model: a DSC sees only their own leads; a manager
// can focus the whole board on the team, their own leads, or one DSC (read-only).
// The board is scoped to a period (default = current month) via a month selector
// or a calendar range, so it shows the leads worked in that window, not all leads.
export default function PipelinePage() {
  const dscs = useActiveDscs();
  const { users } = useUsers();

  // ---- Role (demo switcher; real auth replaces this) -----------------------
  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = users.find((u) => u.id === viewerId) || USER_BY_ID[viewerId];
  const isAdmin = viewer?.role === "admin";
  const isBDM = viewer?.role === "bdm";
  const isManager = isBDM || isAdmin;

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

  // If the focused DSC is deactivated (drops out of the active list), fall back
  // to the team view instead of silently showing the manager's own leads.
  useEffect(() => {
    if (isManager && focus !== "team" && focus !== "self" && !focusDsc) {
      setFocus("team");
    }
  }, [isManager, focus, focusDsc]);

  // Keep the demo viewer valid if the Admin deactivates the current one.
  useEffect(() => {
    const active = users.filter((u) => u.status !== "deactivated");
    if (active.length && !active.some((u) => u.id === viewerId)) {
      setViewerId(active[0].id);
    }
  }, [users, viewerId]);

  const { columns } = useColumnConfig();
  const groups = useMemo(() => groupsOf(columns), [columns]);

  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLead, setDetailLead] = useState(null);

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

  // ---- Scoping by focus ----------------------------------------------------
  const scopeUserId =
    effFocus === "team" ? null : focusIsDsc ? effFocus : viewerId;
  const roleScoped = useMemo(() => {
    if (effFocus === "team") return allLeads;
    return allLeads.filter((l) => l.assignedDscId === scopeUserId);
  }, [allLeads, effFocus, scopeUserId]);

  // ---- Period (month selector, or a calendar range that overrides it) -------
  const monthOptions = useMemo(() => recentMonths(6), []);
  const [periodMonth, setPeriodMonth] = useState(() => monthKeyOf());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const period = useMemo(
    () =>
      dateFrom || dateTo
        ? { from: dateFrom, to: dateTo }
        : monthRange(periodMonth),
    [dateFrom, dateTo, periodMonth]
  );

  // Leads within the period (before search / multi-select) — the period "book".
  const periodScoped = useMemo(
    () => roleScoped.filter((l) => leadInPeriod(l, period.from, period.to)),
    [roleScoped, period]
  );

  // ---- Filters -------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // The DSC filter only shows in team focus. Drop any DSC selection when it's
  // hidden, so it can't silently narrow the board to nothing with no visible
  // control (or chip) to clear it.
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
  function clearAll() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setDateFrom("");
    setDateTo("");
  }

  // Reset filters/period when switching role/viewer (keep the month at current).
  useEffect(() => {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setDateFrom("");
    setDateTo("");
    setPeriodMonth(monthKeyOf());
  }, [viewerId]);

  const showDscFilter = isManager && effFocus === "team";

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(periodScoped.map((l) => l.city).filter(Boolean))
      ).sort(),
    [periodScoped]
  );
  const filterOptions = {
    priority: PRIORITIES,
    industry: INDUSTRIES,
    city: cityOptions,
    leadSource: LEAD_SOURCES,
    assignedDscId: [
      { value: "", label: "Unassigned" },
      ...dscs.map((d) => ({ value: d.id, label: d.name })),
    ],
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodScoped.filter((lead) => {
      for (const key of Object.keys(EMPTY_FILTERS)) {
        const sel = filters[key];
        if (sel.length > 0 && !sel.includes(lead[key])) return false;
      }
      if (q) {
        const hay = SEARCH_KEYS.map((k) => lead[k])
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [periodScoped, search, filters]);

  // ---- Period stats (over the period book, independent of search/filters) ---
  const stats = useMemo(() => {
    let openValue = 0;
    let won = 0;
    let wonValue = 0;
    let overdue = 0;
    for (const l of periodScoped) {
      if (isWon(l.leadStatus)) {
        won += 1;
        wonValue += Number(l.closedAmount) || 0;
      } else if (isActive(l.leadStatus)) {
        openValue += Number(l.quotedAmount) || 0;
        if (isOnOrBefore(l.nextFollowUpDate)) overdue += 1;
      }
    }
    return { total: periodScoped.length, openValue, won, wonValue, overdue };
  }, [periodScoped]);

  // ---- Edit permissions (by role + focus) — same model as the Lead Table ----
  // A status change (drag or the card's select) is an edit, so it's gated by the
  // same rule: a DSC edits their own leads; a manager edits only unassigned or
  // their own; a DSC's lead (or anything while focused on a DSC) is read-only.
  function canEditLead(lead) {
    if (!isManager) return lead?.assignedDscId === viewerId;
    if (focusIsDsc) return false;
    return lead?.assignedDscId === "" || lead?.assignedDscId === viewerId;
  }
  const canReassign = isManager && !focusIsDsc;

  function handleMove(leadId, status) {
    const lead = allLeads.find((l) => l.leadId === leadId);
    if (!canEditLead(lead)) return; // enforce permission (UI also disables it)
    setAllLeads((rows) =>
      rows.map((l) => (l.leadId === leadId ? { ...l, leadStatus: status } : l))
    );
    setDetailLead((d) =>
      d && d.leadId === leadId ? { ...d, leadStatus: status } : d
    );
    updateLead(leadId, { leadStatus: status }).catch((e) => console.error(e));
  }

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

  const subtitle = focusIsDsc
    ? `Viewing ${focusDsc.name}'s pipeline (read-only)`
    : effFocus === "self"
      ? `${viewer?.name}'s pipeline`
      : "Drag a lead between stages to update its status";

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Pipeline"
        subtitle={subtitle}
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

      {!loading ? (
        <PipelineToolbar
          count={filtered.length}
          stats={stats}
          search={search}
          onSearch={setSearch}
          month={periodMonth}
          months={monthOptions}
          onMonth={setPeriodMonth}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
          filters={filters}
          onFilterChange={handleFilterChange}
          options={filterOptions}
          showDscFilter={showDscFilter}
          onClearAll={clearAll}
        />
      ) : null}

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading pipeline…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            No leads for this period. Try another month or widen the date range.
          </div>
        ) : (
          <PipelineBoard
            leads={filtered}
            onMove={handleMove}
            onOpen={setDetailLead}
            canEdit={canEditLead}
          />
        )}
      </div>

      <LeadDetailSidebar
        lead={detailLead}
        canEdit={detailLead ? canEditLead(detailLead) : false}
        canAssign={canReassign}
        groups={groups}
        onChange={handleFieldChange}
        onClose={() => setDetailLead(null)}
      />
    </div>
  );
}
