"use client";

import { useState } from "react";
import { LEAD_STATUSES, dscName } from "@/data/mockLeads";
import { statusBadgeClass } from "@/components/leads/statusStyles";
import { PriorityBadge } from "@/components/leads/LeadStatusBadge";
import { formatINR, formatDate, isOnOrBefore } from "@/lib/format";

// One draggable lead card.
function LeadCard({ lead, onMove, onOpen }) {
  const value = lead.closedAmount ?? lead.quotedAmount;
  const overdue = isOnOrBefore(lead.nextFollowUpDate);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.leadId);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen?.(lead)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:border-brand active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-900">
          {lead.company || "—"}
        </span>
        <PriorityBadge priority={lead.priority} />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">
          {lead.assignedDscId ? dscName(lead.assignedDscId) : "Unassigned"}
        </span>
        {value ? (
          <span className="tabular-nums text-slate-600">
            {formatINR(value)}
          </span>
        ) : null}
      </div>
      {lead.nextFollowUpDate ? (
        <div
          className={`mt-1 text-[11px] ${overdue ? "font-medium text-red-600" : "text-slate-400"}`}
        >
          Next: {formatDate(lead.nextFollowUpDate)}
          {overdue ? " • due" : ""}
        </div>
      ) : null}

      {/* Non-drag alternative: change status via select */}
      <select
        value={lead.leadStatus}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onMove(lead.leadId, e.target.value)}
        className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600 focus:border-brand focus:outline-none"
        aria-label="Change status"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

// Kanban board: one column per pipeline status. Drag a card to another column
// (or use the card's status select) to change its status.
export default function PipelineBoard({ leads, onMove, onOpen }) {
  const [dragOver, setDragOver] = useState(null);

  const byStatus = {};
  LEAD_STATUSES.forEach((s) => (byStatus[s] = []));
  for (const l of leads) {
    (byStatus[l.leadStatus] || (byStatus[l.leadStatus] = [])).push(l);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-6 py-4">
      {LEAD_STATUSES.map((status) => {
        const items = byStatus[status] || [];
        const value = items.reduce(
          (sum, l) => sum + (Number(l.closedAmount ?? l.quotedAmount) || 0),
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
              const leadId = e.dataTransfer.getData("text/plain");
              if (leadId) onMove(leadId, status);
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
                items.map((lead) => (
                  <LeadCard
                    key={lead.leadId}
                    lead={lead}
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
