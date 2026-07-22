"use client";

import { useEffect } from "react";
import { dscName, DEAL_STATUSES } from "@/data/mockLeads";
import { statusBadgeClass } from "@/components/leads/statusStyles";
import { singleDealCommission } from "@/lib/commission";
import { formatINR, formatDate, discountPctLabel } from "@/lib/format";

// Slide-over detail for ONE deal (Lead → Deal model). The pipeline is a board of
// deals, so clicking a card opens the deal — its offering, money, status,
// approval and payment. The win-request lives here too (Won is the money event,
// gated by Admin approval). "Open lead" jumps to the parent prospect record.
function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-slate-800">{value}</div>
    </div>
  );
}

export default function DealDetailSidebar({
  deal, // enriched with { offeringName, company }
  config,
  canEditStatus = false,
  canRequestWin = false,
  onChangeStatus, // (dealId, status) => void
  onRequestWin, // (deal) => void
  onOpenLead, // (leadId) => void
  onClose,
}) {
  useEffect(() => {
    if (!deal) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deal, onClose]);

  const open = Boolean(deal);
  const pending = deal?.approvalStatus === "pending";
  const dscComm = deal ? singleDealCommission(deal, config, "dsc") : 0;
  const bdmComm = deal ? singleDealCommission(deal, config, "bdm") : 0;

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
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Deal details"
      >
        {deal ? (
          <>
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {deal.company || "—"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  {deal.offeringName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">
                    {deal.dealId}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(deal.dealStatus)}`}
                  >
                    {deal.dealStatus}
                  </span>
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

            {pending ? (
              <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-700">
                ⏳ Win request pending Admin approval.
              </div>
            ) : deal.approvalStatus === "rejected" ? (
              <div className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-xs text-red-700">
                ✕ Last win request was rejected
                {deal.approvalReason ? `: “${deal.approvalReason}”` : ""}.
                Revise and resend.
              </div>
            ) : null}

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
              {/* Status control */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Stage
                </label>
                <select
                  value={deal.dealStatus}
                  disabled={!canEditStatus || pending}
                  onChange={(e) =>
                    onChangeStatus?.(deal.dealId, e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label="Deal stage"
                >
                  {DEAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Owner"
                  value={deal.ownerId ? dscName(deal.ownerId) : "Unassigned"}
                />
                <Field label="Created" value={formatDate(deal.createdDate)} />
                <Field
                  label="Quoted"
                  value={formatINR(deal.quotedAmount ?? 0)}
                />
                <Field
                  label="Closed"
                  value={
                    deal.closedAmount != null
                      ? formatINR(deal.closedAmount)
                      : "—"
                  }
                />
                <Field label="Discount" value={discountPctLabel(deal)} />
                <Field
                  label="Payment"
                  value={deal.paymentStatus || "Pending"}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Commission (catalog)
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-slate-700">
                  <span>
                    DSC:{" "}
                    <span className="font-semibold">{formatINR(dscComm)}</span>
                  </span>
                  <span>
                    BDM:{" "}
                    <span className="font-semibold">{formatINR(bdmComm)}</span>
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  From the compensation catalog for this offering. Credited when
                  the deal is Won and approved.
                </p>
              </div>

              {deal.notes ? (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Notes
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
                    {deal.notes}
                  </p>
                </div>
              ) : null}

              {onOpenLead ? (
                <button
                  type="button"
                  onClick={() => onOpenLead(deal.leadId)}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Open lead ↗
                </button>
              ) : null}
            </div>

            {canRequestWin ? (
              <div className="border-t border-slate-200 px-6 py-3">
                <button
                  type="button"
                  onClick={() => onRequestWin(deal)}
                  className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  🏆 Win deal — request approval
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
