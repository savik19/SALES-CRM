"use client";

import { useEffect, useState } from "react";
import { dscName, LOST_REASONS } from "@/data/mockLeads";
import { StageBadge, ApprovalBadge } from "@/components/leads/LeadStatusBadge";
import ActivityLog from "@/components/leads/ActivityLog";
import { singleDealCommission } from "@/lib/commission";
import { formatINR, formatDate, discountPctLabel } from "@/lib/format";
import { labelOf, DEAL_STAGE, DEAL_APPROVAL } from "@/lib/statuses";

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

function AmountField({ label, value, editable, onChange, hint }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      {editable ? (
        <input
          type="number"
          min={0}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          aria-label={label}
          className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      ) : (
        <div className="mt-0.5 text-sm text-slate-800">
          {value != null ? formatINR(value) : "—"}
        </div>
      )}
      {hint ? <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default function DealDetailSidebar({
  deal, // enriched with { offeringName, company }
  config,
  selectableStages = () => [],
  canEditAmounts = false,
  approvalEligibility = () => ({ ok: false, reason: "" }),
  canWithdraw = false,
  isAdmin = false,
  onChangeStage, // (dealId, stage) => void
  onChangeField, // (dealId, patch) => void
  onRequestWin, // (deal) => void
  onWithdraw, // (dealId) => void
  onApprove, // (dealId) => void
  onReject, // (dealId, reason) => void
  onDeliver, // (dealId) => void
  onReverse, // (dealId, reason) => void
  onOpenLead,
  onClose,
}) {
  useEffect(() => {
    if (!deal) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deal, onClose]);

  const open = Boolean(deal);
  const pending = deal?.approval === DEAL_APPROVAL.PENDING;
  const approved = deal?.approval === DEAL_APPROVAL.APPROVED;
  const stages = deal ? selectableStages(deal) : [];
  const elig = deal ? approvalEligibility(deal) : { ok: false, reason: "" };
  const dscComm = deal ? singleDealCommission(deal, config, "dsc") : 0;
  const bdmComm = deal ? singleDealCommission(deal, config, "bdm") : 0;
  const setAmount = (key) => (v) => onChangeField?.(deal.dealId, { [key]: v });

  function promptReason(action, fn) {
    const reason = window.prompt(`Reason for ${action}:`);
    if (reason && reason.trim()) fn(deal.dealId, reason.trim());
  }

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
                  <StageBadge stage={deal.stage} />
                  <ApprovalBadge approval={deal.approval} />
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
                ⏳ Awaiting Admin approval to start the project. Stage is locked.
              </div>
            ) : deal.approval === DEAL_APPROVAL.REJECTED ? (
              <div className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-xs text-red-700">
                ✕ Last approval request was rejected
                {deal.approvalReason ? `: “${deal.approvalReason}”` : ""}. Revise
                and resend.
              </div>
            ) : deal.approval === DEAL_APPROVAL.REVERSED ? (
              <div className="border-b border-slate-300 bg-slate-100 px-6 py-2.5 text-xs text-slate-700">
                ↩ This approved deal was reversed
                {deal.approvalReason ? `: “${deal.approvalReason}”` : ""}.
              </div>
            ) : null}

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
              {/* Stage control — only the stages this viewer may pick. */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Stage
                </label>
                <select
                  value={deal.stage}
                  disabled={stages.length === 0}
                  onChange={(e) => onChangeStage?.(deal.dealId, e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label="Deal stage"
                >
                  {[...new Set([deal.stage, ...stages])].map((s) => (
                    <option key={s} value={s}>
                      {labelOf(s)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  Project Started / Delivered are set by Admin approval, not here.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AmountField
                  label="Pitched"
                  value={deal.quotedAmount}
                  editable={canEditAmounts}
                  onChange={setAmount("quotedAmount")}
                  hint="What we quoted"
                />
                <AmountField
                  label="Final"
                  value={deal.finalAmount}
                  editable={canEditAmounts}
                  onChange={setAmount("finalAmount")}
                  hint="Agreed price (commission base)"
                />
                <Field label="Discount" value={discountPctLabel(deal)} />
                <Field label="Payment" value={deal.paymentStatus || "Pending"} />
                <Field
                  label="Owner"
                  value={deal.ownerId ? dscName(deal.ownerId) : "Unassigned"}
                />
                <Field label="Created" value={formatDate(deal.createdDate)} />
              </div>

              {deal.stage === DEAL_STAGE.CANCELLED ? (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Cancellation reason
                  </label>
                  {canEditAmounts ? (
                    <select
                      value={deal.lostReason || ""}
                      onChange={(e) =>
                        onChangeField?.(deal.dealId, {
                          lostReason: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      aria-label="Cancellation reason"
                    >
                      <option value="">Select…</option>
                      {LOST_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-slate-800">
                      {deal.lostReason || deal.approvalReason || "—"}
                    </div>
                  )}
                </div>
              ) : null}

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
                  Priced from the final amount. Accrued (held) on approval,
                  released as payable on delivery.
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

              {/* Activity — the last 20 audit entries for this deal. */}
              <ActivityLog entityType="deal" entityId={deal.dealId} />
            </div>

            {/* Footer actions */}
            <div className="space-y-2 border-t border-slate-200 px-6 py-3">
              {/* Admin approval controls */}
              {isAdmin && pending ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove?.(deal.dealId)}
                    className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => promptReason("rejection", onReject)}
                    className="flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Reject…
                  </button>
                </div>
              ) : null}
              {isAdmin && approved && deal.stage === DEAL_STAGE.PROJECT_STARTED ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDeliver?.(deal.dealId)}
                    className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Set Delivered
                  </button>
                  <button
                    type="button"
                    onClick={() => promptReason("reversal", onReverse)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Reverse…
                  </button>
                </div>
              ) : null}

              {/* Owner: request approval / withdraw */}
              {canWithdraw ? (
                <button
                  type="button"
                  onClick={() => onWithdraw?.(deal.dealId)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Withdraw approval request
                </button>
              ) : !approved &&
                deal.approval !== DEAL_APPROVAL.REVERSED &&
                !pending ? (
                <div title={elig.ok ? "" : elig.reason}>
                  <button
                    type="button"
                    disabled={!elig.ok}
                    onClick={() => onRequestWin?.(deal)}
                    className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    Request Start Project Approval
                  </button>
                  <p className="mt-1.5 text-center text-[11px] text-slate-400">
                    {elig.ok
                      ? "Sends the deal to the Admin; credited only once approved."
                      : elig.reason}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
