"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import DealBoard from "@/components/pipeline/DealBoard";
import DealToolbar from "@/components/pipeline/DealToolbar";
import DealDetailSidebar from "@/components/pipeline/DealDetailSidebar";
import DealWinRequestModal from "@/components/pipeline/DealWinRequestModal";
import { useCompConfig } from "@/lib/compConfig";
import { useDeals, DEAD_DEAL_STATUSES } from "@/lib/useDeals";
import {
  USER_BY_ID,
  DEAL_STATUSES,
  CREDITED_DEAL_STATUSES,
} from "@/data/mockLeads";
import { useActiveDscs, useUsers } from "@/lib/usersConfig";
import { monthRange, recentMonths, monthKeyOf, isoInRange } from "@/lib/format";

const EMPTY_FILTERS = { dealStatus: [], ownerId: [] };
const SEARCH_KEYS = ["company", "offeringName"];

// A deal is "in" the period if it was created or won within it.
function dealInPeriod(deal, from, to) {
  if (!from && !to) return true;
  return (
    isoInRange(deal.createdDate, from, to) ||
    isoInRange(deal.wonApprovedDate, from, to)
  );
}

// Pipeline / Kanban board of DEALS (Lead → Deal model). Each card is one offering
// under a company; drag a card between stages — or use the card's status select —
// to move the deal. The DSC moves it freely up to "Won"; advancing to
// "Project Started" needs the finalized amount + Admin approval (the money event
// that credits target + commission). Mirrors the Lead Table's role model: a DSC
// sees only their own deals; a manager can focus on the team, their own, or a DSC.
export default function PipelinePage() {
  const dscs = useActiveDscs();
  const { users } = useUsers();
  const { config } = useCompConfig();

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

  useEffect(() => {
    if (isManager && focus !== "team" && focus !== "self" && !focusDsc) {
      setFocus("team");
    }
  }, [isManager, focus, focusDsc]);

  useEffect(() => {
    const active = users.filter((u) => u.status !== "deactivated");
    if (active.length && !active.some((u) => u.id === viewerId)) {
      setViewerId(active[0].id);
    }
  }, [users, viewerId]);

  // ---- Deal data + actions (shared hook; also used by the Lead Table) ------
  const dealsApi = useDeals({ viewerId, isManager, focusIsDsc, config });
  const { deals: allDeals, loading } = dealsApi;

  // ---- Scoping by focus (owner) --------------------------------------------
  const scopeUserId =
    effFocus === "team" ? null : focusIsDsc ? effFocus : viewerId;
  const roleScoped = useMemo(() => {
    if (effFocus === "team") return allDeals;
    return allDeals.filter((d) => d.ownerId === scopeUserId);
  }, [allDeals, effFocus, scopeUserId]);

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

  const periodScoped = useMemo(
    () => roleScoped.filter((d) => dealInPeriod(d, period.from, period.to)),
    [roleScoped, period]
  );

  // ---- Filters -------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // The Owner filter only shows in team focus. Drop any selection when hidden.
  useEffect(() => {
    if (effFocus !== "team") {
      setFilters((f) => (f.ownerId.length ? { ...f, ownerId: [] } : f));
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
  useEffect(() => {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setDateFrom("");
    setDateTo("");
    setPeriodMonth(monthKeyOf());
  }, [viewerId]);

  const showOwnerFilter = isManager && effFocus === "team";

  const filterOptions = {
    dealStatus: DEAL_STATUSES,
    ownerId: [
      { value: "", label: "Unassigned" },
      ...dscs.map((d) => ({ value: d.id, label: d.name })),
    ],
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodScoped.filter((deal) => {
      if (
        filters.dealStatus.length &&
        !filters.dealStatus.includes(deal.dealStatus)
      )
        return false;
      if (filters.ownerId.length && !filters.ownerId.includes(deal.ownerId))
        return false;
      if (q) {
        const hay = SEARCH_KEYS.map((k) => deal[k])
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [periodScoped, search, filters]);

  // Which status columns to render: the selected ones (in pipeline order), or
  // every stage when nothing is selected.
  const visibleStatuses = useMemo(
    () =>
      filters.dealStatus.length
        ? DEAL_STATUSES.filter((s) => filters.dealStatus.includes(s))
        : DEAL_STATUSES,
    [filters.dealStatus]
  );

  // ---- Deal stats (over the board book, independent of search/filters) ------
  const stats = useMemo(() => {
    let openValue = 0;
    let won = 0;
    let wonValue = 0;
    let pending = 0;
    for (const d of periodScoped) {
      if (CREDITED_DEAL_STATUSES.has(d.dealStatus)) {
        won += 1;
        wonValue += Number(d.closedAmount) || 0;
      } else if (!DEAD_DEAL_STATUSES.has(d.dealStatus)) {
        openValue += Number(d.closedAmount ?? d.quotedAmount) || 0;
      }
      if (d.approvalStatus === "pending") pending += 1;
    }
    return { total: periodScoped.length, openValue, won, wonValue, pending };
  }, [periodScoped]);

  // Move / edit / approval logic all live in the useDeals hook so the Pipeline
  // and the Lead Table's Deals view behave identically.
  const {
    canEditDeal,
    canEditAmounts,
    canRequestWin,
    detailDeal,
    setDetailDeal,
    moveDeal,
    editDeal,
    winDeal,
    winToStatus,
    openWinRequest,
    submitWinRequest,
    closeWinRequest,
  } = dealsApi;

  const subtitle = focusIsDsc
    ? `Viewing ${focusDsc.name}'s deals (read-only)`
    : effFocus === "self"
      ? `${viewer?.name}'s deals`
      : "Drag a deal between stages — starting a project needs Admin approval";

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
                  {isBDM ? <option value="self">My deals</option> : null}
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
        <DealToolbar
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
          showOwnerFilter={showOwnerFilter}
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
            No deals for this selection. Try another month, widen the date
            range, or clear the filters. Create deals from a lead in the Lead
            Table.
          </div>
        ) : (
          <DealBoard
            deals={filtered}
            statuses={visibleStatuses}
            moveOptions={DEAL_STATUSES}
            onMove={moveDeal}
            onOpen={setDetailDeal}
            canEdit={canEditDeal}
          />
        )}
      </div>

      <DealDetailSidebar
        deal={detailDeal}
        config={config}
        canEditStatus={canEditDeal(detailDeal)}
        canEditAmounts={canEditAmounts(detailDeal)}
        canRequestWin={canRequestWin(detailDeal)}
        onChangeStatus={moveDeal}
        onChangeField={editDeal}
        onRequestWin={(deal) => openWinRequest(deal, "Project Started")}
        onClose={() => setDetailDeal(null)}
      />

      <DealWinRequestModal
        open={!!winDeal}
        deal={winDeal}
        toStatus={winToStatus}
        requestedBy={viewerId}
        today={monthKeyOf() + "-15"}
        onSubmit={submitWinRequest}
        onClose={closeWinRequest}
      />
    </div>
  );
}
