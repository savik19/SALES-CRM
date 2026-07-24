"use client";

import { useEffect } from "react";
import ExpandedLeadRow from "./ExpandedLeadRow";
import { StatusBadge, PriorityBadge } from "./LeadStatusBadge";
import { formatINR } from "@/lib/format";

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
  // ---- Lead → Deal model -------------------------------------------------
  deals = [], // this lead's deals, each enriched with { offeringName, offeringKind }
  canManageDeals = false, // owner/manager (not a read-only DSC view)
  canCreateDeal = false, // lead has ≥1 Service Interested that maps to an offering
  onCreateDeal, // (lead) => void — open the create-deal modal
  onOpenDeal, // (deal) => void — open the deal detail
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

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ExpandedLeadRow
                lead={lead}
                canEdit={canEdit}
                canAssign={canAssign}
                onChange={onChange}
                groups={groups}
                variant="sidebar"
              />

              {/* ---- Deals (one offering each) ---- */}
              <section className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Deals ({deals.length})
                  </h4>
                  {canManageDeals ? (
                    <button
                      type="button"
                      onClick={() => onCreateDeal?.(lead)}
                      disabled={!canCreateDeal}
                      className="shrink-0 rounded-md border border-brand px-2 py-0.5 text-xs font-medium text-brand hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        canCreateDeal
                          ? "Create a deal"
                          : "Mark a Service Interested above first"
                      }
                    >
                      + Create deal
                    </button>
                  ) : null}
                </div>
                {deals.length ? (
                  <ul className="space-y-1.5">
                    {deals.map((d) => (
                      <li key={d.dealId}>
                        <button
                          type="button"
                          onClick={() => onOpenDeal?.(d)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-brand hover:bg-slate-50"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-800">
                              {d.offeringName}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                              {d.dealStatus}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-xs text-slate-500">
                            {formatINR(d.closedAmount ?? d.quotedAmount)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    No deals yet. Set the lead’s <b>Services Interested</b>{" "}
                    above, then “+ Create deal” once they confirm.
                  </p>
                )}
              </section>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
