"use client";

import { statusBadgeClass } from "@/components/leads/statusStyles";
import { formatINR, discountPctLabel } from "@/lib/format";

// The row-expansion body in the Lead (prospect) view: what the lead is
// interested in, and the DEALS created under it (one offering each). This is the
// "see the lead broadly, and the deals inside it" surface. Editing a deal opens
// the deal detail; full lead fields live in the side panel ("Full details").
const APPROVAL_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function LeadDealsPanel({
  lead,
  deals = [], // this lead's deals, enriched with offeringName
  catalogOfferings = [],
  interestIds = [],
  canManageDeals = false,
  onToggleInterest, // (offeringId) => void
  onCreateDeal, // (lead) => void
  onOpenDeal, // (deal) => void
  onOpenFull, // (lead) => void — open the full lead detail sidebar
}) {
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400">
            {lead.leadId}
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {lead.company}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenFull?.(lead)}
          className="text-xs font-medium text-brand hover:underline"
        >
          Full details ↗
        </button>
      </div>

      {/* Interested in */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Interested in
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {catalogOfferings.map((o) => {
            const on = interestIds.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                disabled={!canManageDeals}
                onClick={() => onToggleInterest?.(o.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  on
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                } ${!canManageDeals ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Deals */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Deals ({deals.length})
          </h4>
          {canManageDeals ? (
            <button
              type="button"
              onClick={() => onCreateDeal?.(lead)}
              disabled={interestIds.length === 0}
              className="shrink-0 rounded-md border border-brand px-2 py-0.5 text-xs font-medium text-brand hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                interestIds.length === 0
                  ? "Mark interest first, then create a deal"
                  : "Create a deal"
              }
            >
              + Create deal
            </button>
          ) : null}
        </div>

        {deals.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Offering</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Pitched
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Finalized
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Discount
                  </th>
                  <th className="px-3 py-2 font-semibold">Approval</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr
                    key={d.dealId}
                    onClick={() => onOpenDeal?.(d)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {d.offeringName}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(d.dealStatus)}`}
                      >
                        {d.dealStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {d.quotedAmount != null ? formatINR(d.quotedAmount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {d.closedAmount != null ? formatINR(d.closedAmount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {discountPctLabel(d)}
                    </td>
                    <td className="px-3 py-2">
                      {APPROVAL_BADGE[d.approvalStatus] ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_BADGE[d.approvalStatus]}`}
                        >
                          {d.approvalStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No deals yet. Mark what the lead is interested in above, then “+
            Create deal” once they confirm.
          </p>
        )}
      </section>
    </div>
  );
}
