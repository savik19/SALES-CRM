"use client";

import { useState } from "react";
import { dscName } from "@/data/mockLeads";
import { StageBadge } from "@/components/leads/LeadStatusBadge";
import { formatINR } from "@/lib/format";
import {
  DEAL_STAGE,
  DEAL_APPROVAL,
  KANBAN_STAGES,
  OUTCOME_STAGES,
  labelOf,
} from "@/lib/statuses";

const READ_ONLY_STAGES = new Set(OUTCOME_STAGES); // project_started, project_delivered
const BOARD_COLUMNS = [...KANBAN_STAGES, ...OUTCOME_STAGES]; // 4 drag + 2 outcome

// One deal card. Draggable only when the viewer may move it AND it isn't pending
// (a pending deal is locked with a lock icon). The card's stage select offers
// only the stages the viewer may pick (`selectableStages(deal)`).
function DealCard({ deal, canDrag, selectableStages, onMove, onReject, onOpen }) {
  const value = deal.finalAmount ?? deal.quotedAmount;
  const pending = deal.approval === DEAL_APPROVAL.PENDING;
  const rejected = deal.approval === DEAL_APPROVAL.REJECTED;
  const approved = deal.approval === DEAL_APPROVAL.APPROVED;
  const reversed = deal.approval === DEAL_APPROVAL.REVERSED;
  const options = selectableStages(deal);
  return (
    <div
      draggable={canDrag}
      onDragStart={
        canDrag
          ? (e) => {
              e.dataTransfer.setData("text/plain", deal.dealId);
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      onClick={() => onOpen?.(deal)}
      className={`rounded-lg border bg-white p-2.5 shadow-sm hover:border-brand ${
        pending ? "border-amber-200" : "border-slate-200"
      } ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      title={
        pending
          ? "Locked — awaiting Admin approval"
          : canDrag
          ? undefined
          : "Read-only"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-900">
          {pending && <span className="mr-1">🔒</span>}
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
            ⏳ Pending
          </span>
        ) : rejected ? (
          <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-700">
            ✕ Rejected
          </span>
        ) : approved ? (
          <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 font-medium text-green-700">
            ✓ Approved
          </span>
        ) : reversed ? (
          <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 font-medium text-white">
            ↩ Reversed
          </span>
        ) : null}
      </div>

      {/* Non-drag alternative: change stage via select. Only rendered when the
          viewer actually has selectable stages for this deal. */}
      {options.length > 0 && (
        <select
          value={deal.stage}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const res = onMove(deal.dealId, e.target.value);
            if (res && !res.ok) onReject?.(res.reason);
          }}
          className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600 focus:border-brand focus:outline-none"
          aria-label="Change deal stage"
        >
          {/* keep the current stage visible even if not otherwise selectable */}
          {[...new Set([deal.stage, ...options])].map((s) => (
            <option key={s} value={s}>
              {labelOf(s)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// Kanban board of DEALS. Columns = the 4 user-controllable stages (Open ·
// Proposal Sent · Negotiation · Cancelled) plus two READ-ONLY trailing columns
// (Started · Delivered) that are set by Admin approval, not drag. Dropping into a
// read-only column is rejected with a toast.
export default function DealBoard({
  deals,
  selectableStages = () => [],
  canDrag = () => false,
  onMove,
  onReject,
  onOpen,
}) {
  const [dragOver, setDragOver] = useState(null);

  const byStage = {};
  BOARD_COLUMNS.forEach((s) => (byStage[s] = []));
  for (const d of deals) {
    (byStage[d.stage] || (byStage[d.stage] = [])).push(d);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-6 py-4">
      {BOARD_COLUMNS.map((stage) => {
        const items = byStage[stage] || [];
        const readOnly = READ_ONLY_STAGES.has(stage);
        const value = items.reduce(
          (sum, d) => sum + (Number(d.finalAmount ?? d.quotedAmount) || 0),
          0
        );
        return (
          <div
            key={stage}
            onDragOver={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    setDragOver(stage);
                  }
            }
            onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const dealId = e.dataTransfer.getData("text/plain");
              setDragOver(null);
              if (!dealId) return;
              if (readOnly) {
                onReject?.(
                  "Project Started is set by Admin approval. Use Request Approval."
                );
                return;
              }
              const res = onMove(dealId, stage);
              if (res && !res.ok) onReject?.(res.reason);
            }}
            className={`flex w-64 shrink-0 flex-col rounded-xl border ${
              readOnly ? "border-dashed border-slate-300 bg-slate-100/60" : ""
            } ${
              dragOver === stage
                ? "border-brand bg-brand-50/50"
                : readOnly
                ? ""
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
              <span className="inline-flex items-center gap-1">
                <StageBadge stage={stage} />
                {readOnly && (
                  <span className="text-[9px] uppercase tracking-wide text-slate-400">
                    read-only
                  </span>
                )}
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
                  {readOnly ? "Set by approval" : "Drop here"}
                </p>
              ) : (
                items.map((deal) => (
                  <DealCard
                    key={deal.dealId}
                    deal={deal}
                    canDrag={canDrag(deal)}
                    selectableStages={selectableStages}
                    onMove={onMove}
                    onReject={onReject}
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
