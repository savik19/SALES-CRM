"use client";

import { useEffect } from "react";
import ExpandedLeadRow from "./ExpandedLeadRow";
import { StatusBadge, PriorityBadge } from "./LeadStatusBadge";

// Slide-over lead detail, opened by clicking the Company name or Lead Id in a
// row (the row's expand arrow opens the inline dropdown instead — two ways to
// see the same detail). Shows every field; editable ones are editable inline,
// reusing ExpandedLeadRow so the two views never drift apart.
export default function LeadDetailSidebar({
  lead,
  canEdit = false,
  canAssign = false,
  groups,
  onChange,
  onClose,
  onRequestWin, // (lead) => void — opens the "close deal" approval request
  canRequestWin = false, // eligible to request (owner + active + not pending)
}) {
  useEffect(() => {
    if (!lead) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  const open = Boolean(lead);

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col bg-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Lead details"
      >
        {lead ? (
          <>
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {lead.company || "—"}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {lead.leadId}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={lead.leadStatus} />
                  <PriorityBadge priority={lead.priority} />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {lead.approvalStatus === "pending" ? (
              <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-700">
                ⏳ Close request pending Admin approval.
              </div>
            ) : lead.approvalStatus === "rejected" ? (
              <div className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-xs text-red-700">
                ✕ Last close request was rejected
                {lead.approvalReason ? `: “${lead.approvalReason}”` : ""}.
                Revise and resend.
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ExpandedLeadRow
                lead={lead}
                canEdit={canEdit}
                canAssign={canAssign}
                onChange={onChange}
                groups={groups}
                variant="sidebar"
              />
            </div>

            {canRequestWin ? (
              <div className="border-t border-slate-200 px-6 py-3">
                <button
                  type="button"
                  onClick={() => onRequestWin(lead)}
                  className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  🏆 Close deal — request approval (Project Started)
                </button>
                <p className="mt-1.5 text-center text-[11px] text-slate-400">
                  Sends the deal to the Admin; credited as won only once
                  approved.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </aside>
    </>
  );
}
