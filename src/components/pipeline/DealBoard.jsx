"use client";

import { useState } from "react";
import { DEAL_STATUSES, dscName } from "@/data/mockLeads";
import { statusBadgeClass } from "@/components/leads/statusStyles";
import { formatINR } from "@/lib/format";

// One deal card (Lead → Deal model): a single offering under a company. Draggable
// + status-editable only when `editable` (the page decides this from the same
// permission model as the leads — a deal owned by another DSC is read-only).
// Moving a card INTO a won stage doesn't set it directly; the page intercepts it
// to raise an Admin approval request (Won is the money event).
function DealCard({ deal, editable, moveOptions, onMove, onOpen }) {
  const value = deal.closedAmount ?? deal.quotedAmount;
  const pending = deal.approvalStatus === "pending";
  const rejected = deal.approvalStatus === "rejected";
  return (
    <div
      draggable={editable}
      onDragStart={
        editable
          ? (e) => {
              e.dataTransfer.setData("text/plain", deal.dealId);
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      onClick={() => onOpen?.(deal)}
      className={`rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:border-brand ${
        editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      title={editable ? undefined : "Read-only — owned by another DSC"}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-900">
          {deal.company || "—"}
        </span>
        {value ? (
          <span className="shrink-0 tabular-nums text-xs text-slate-600">
            {formatINR(value)}
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 truncate text-xs text-slate-500">
        {deal.offeringName}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="truncate">
          {deal.ownerId ? dscName(deal.ownerId) : "Unassigned"}
        </span>
        {pending ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
            ⏳ Approval pending
          </span>
        ) : rejected ? (
          <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-700">
            ✕ Rejected
          </span>
        ) : null}
      </div>

      {/* Non-drag alternative: change status via select (disabled when read-only
          or while an approval is pending). */}
      <select
        value={deal.dealStatus}
        disabled={!editable || pending}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onMove(deal.dealId, e.target.value)}
        className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600 focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Change deal status"
      >
        {moveOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

// Kanban board of DEALS: one column per visible deal status (in pipeline order).
// Drag a card to another column (or use the card's status select) to change its
// status. `canEdit(deal)` decides per card whether it can be moved (read-only
// deals can still be opened); `moveOptions` are the statuses a card's select
// offers.
export default function DealBoard({
  deals,
  statuses = DEAL_STATUSES,
  moveOptions = DEAL_STATUSES,
  onMove,
  onOpen,
  canEdit = () => true,
}) {
  const [dragOver, setDragOver] = useState(null);

  const byStatus = {};
  statuses.forEach((s) => (byStatus[s] = []));
  for (const d of deals) {
    (byStatus[d.dealStatus] || (byStatus[d.dealStatus] = [])).push(d);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-6 py-4">
      {statuses.map((status) => {
        const items = byStatus[status] || [];
        const value = items.reduce(
          (sum, d) => sum + (Number(d.closedAmount ?? d.quotedAmount) || 0),
          0
        );
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const dealId = e.dataTransfer.getData("text/plain");
              // The page's onMove re-checks permission (defense in depth) and
              // intercepts the win transition; only editable cards are draggable.
              if (dealId) onMove(dealId, status);
              setDragOver(null);
            }}
            className={`flex w-64 shrink-0 flex-col rounded-xl border ${
              dragOver === status
                ? "border-brand bg-brand-50/50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
              <span
                className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
              >
                {status}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {items.length}
              </span>
            </div>
            {value > 0 ? (
              <div className="px-3 pt-1 text-[11px] text-slate-400">
                {formatINR(value)}
              </div>
            ) : null}
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-slate-300">
                  Drop here
                </p>
              ) : (
                items.map((deal) => (
                  <DealCard
                    key={deal.dealId}
                    deal={deal}
                    editable={canEdit(deal)}
                    moveOptions={moveOptions}
                    onMove={onMove}
                    onOpen={onOpen}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
