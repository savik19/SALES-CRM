"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import DealBoard from "@/components/pipeline/DealBoard";
import DealToolbar from "@/components/pipeline/DealToolbar";
import DealDetailSidebar from "@/components/pipeline/DealDetailSidebar";
import DealWinRequestModal from "@/components/pipeline/DealWinRequestModal";
import { useCompConfig } from "@/lib/compConfig";
import { useDeals } from "@/lib/useDeals";
import { USER_BY_ID } from "@/data/mockLeads";
import {
  DEAL_STAGE_OPTIONS,
  DEAL_APPROVAL_OPTIONS,
  DEAL_APPROVAL,
  KANBAN_STAGES,
} from "@/lib/statuses";
import { useActiveDscs, useUsers } from "@/lib/usersConfig";
import { monthRange, recentMonths, monthKeyOf, isoInRange } from "@/lib/format";

const EMPTY_FILTERS = { stage: [], approval: [], ownerId: [] };
const SEARCH_KEYS = ["company", "offeringName"];

function dealInPeriod(deal, from, to) {
  if (!from && !to) return true;
  return (
    isoInRange(deal.createdDate, from, to) ||
    isoInRange(deal.wonApprovedDate, from, to)
  );
}

// Pipeline / Kanban board of DEALS. Columns are the 4 user-controllable stages
// (Open · Proposal Sent · Negotiation · Cancelled) plus two read-only trailing
// columns (Started · Delivered) set by Admin approval. Advancing to Project
// Started needs the finalized amount + Admin approval (the money event).
export default function PipelinePage() {
  const dscs = useActiveDscs();
  const { users } = useUsers();
  const { config } = useCompConfig();

  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = users.find((u) => u.id === viewerId) || USER_BY_ID[viewerId];
  const isAdmin = viewer?.role === "admin";
  const isBDM = viewer?.role === "bdm";
  const isManager = isBDM || isAdmin;

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

  const dealsApi = useDeals({ user: viewer, focusIsDsc, config });
  const { deals: allDeals, loading } = dealsApi;

  const scopeUserId =
    effFocus === "team" ? null : focusIsDsc ? effFocus : viewerId;
  const roleScoped = useMemo(() => {
    if (effFocus === "team") return allDeals;
    return allDeals.filter((d) => d.ownerId === scopeUserId);
  }, [allDeals, effFocus, scopeUserId]);

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

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

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
    stage: DEAL_STAGE_OPTIONS,
    approval: DEAL_APPROVAL_OPTIONS,
    ownerId: [
      { value: "", label: "Unassigned" },
      ...dscs.map((d) => ({ value: d.id, label: d.name })),
    ],
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodScoped.filter((deal) => {
      if (filters.stage.length && !filters.stage.includes(deal.stage))
        return false;
      if (filters.approval.length && !filters.approval.includes(deal.approval))
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

  const stats = useMemo(() => {
    let openValue = 0;
    let won = 0;
    let wonValue = 0;
    let pending = 0;
    for (const d of periodScoped) {
      if (d.approval === DEAL_APPROVAL.APPROVED) {
        won += 1;
        wonValue += Number(d.finalAmount) || 0;
      } else if (
        d.approval !== DEAL_APPROVAL.REVERSED &&
        d.stage !== "cancelled"
      ) {
        openValue += Number(d.finalAmount ?? d.quotedAmount) || 0;
      }
      if (d.approval === DEAL_APPROVAL.PENDING) pending += 1;
    }
    return { total: periodScoped.length, openValue, won, wonValue, pending };
  }, [periodScoped]);

  const {
    canEditStage,
    selectableStages,
    canEditAmounts,
    approvalEligibility,
    canWithdraw,
    detailDeal,
    setDetailDeal,
    moveDeal,
    editDeal,
    winDeal,
    openWinRequest,
    submitWinRequest,
    closeWinRequest,
    withdrawRequest,
    approveDealAction,
    rejectDealAction,
    deliverDealAction,
    reverseDealAction,
  } = dealsApi;

  // A card is draggable only when it is pre-approval and this viewer may edit it.
  const canDrag = (deal) =>
    (deal.approval === DEAL_APPROVAL.NOT_REQUESTED ||
      deal.approval === DEAL_APPROVAL.REJECTED) &&
    canEditStage(deal);
  // On the board, editable cards only offer the 4 kanban stages.
  const boardSelectable = (deal) => (canDrag(deal) ? KANBAN_STAGES : []);

  const subtitle = focusIsDsc
    ? `Viewing ${focusDsc.name}'s deals (read-only)`
    : effFocus === "self"
      ? `${viewer?.name}'s deals`
      : "Drag between stages — starting a project needs Admin approval";

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

      <div className="relative flex-1 overflow-hidden">
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
            selectableStages={boardSelectable}
            canDrag={canDrag}
            onMove={moveDeal}
            onReject={setToast}
            onOpen={setDetailDeal}
          />
        )}

        {toast ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>
        ) : null}
      </div>

      <DealDetailSidebar
        deal={detailDeal}
        config={config}
        selectableStages={selectableStages}
        canEditAmounts={canEditAmounts(detailDeal)}
        approvalEligibility={approvalEligibility}
        canWithdraw={canWithdraw(detailDeal)}
        isAdmin={isAdmin}
        onChangeStage={(id, stage) => {
          const res = moveDeal(id, stage);
          if (res && !res.ok) setToast(res.reason);
        }}
        onChangeField={editDeal}
        onRequestWin={openWinRequest}
        onWithdraw={withdrawRequest}
        onApprove={approveDealAction}
        onReject={rejectDealAction}
        onDeliver={deliverDealAction}
        onReverse={reverseDealAction}
        onClose={() => setDetailDeal(null)}
      />

      <DealWinRequestModal
        open={!!winDeal}
        deal={winDeal}
        requestedBy={viewerId}
        today={monthKeyOf() + "-15"}
        onSubmit={submitWinRequest}
        onClose={closeWinRequest}
      />
    </div>
  );
}
