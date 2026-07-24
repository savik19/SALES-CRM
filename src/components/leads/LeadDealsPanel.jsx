"use client";

import { StageBadge, ApprovalBadge } from "@/components/leads/LeadStatusBadge";
import { formatINR, discountPctLabel } from "@/lib/format";

// The row-expansion body in the Lead (prospect) view: what the lead is
// interested in, and the DEALS created under it (one offering each). This is the
// "see the lead broadly, and the deals inside it" surface. Editing a deal opens
// the deal detail; full lead fields live in the side panel ("Full details").

export default function LeadDealsPanel({
  lead,
  deals = [], // this lead's deals, enriched with offeringName
  canManageDeals = false,
  canCreateDeal = false, // lead has ≥1 Service Interested that maps to an offering
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
              disabled={!canCreateDeal}
              className="shrink-0 rounded-md border border-brand px-2 py-0.5 text-xs font-medium text-brand hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                canCreateDeal
                  ? "Create a deal"
                  : "Mark a Service Interested on the lead first"
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
                  <th className="px-3 py-2 font-semibold">Stage</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Pitched
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">Final</th>
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
                      <StageBadge stage={d.stage} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {d.quotedAmount != null ? formatINR(d.quotedAmount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {d.finalAmount != null ? formatINR(d.finalAmount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {discountPctLabel(d)}
                    </td>
                    <td className="px-3 py-2">
                      <ApprovalBadge approval={d.approval} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No deals yet. Set the lead’s <b>Services Interested</b> (Full
            details), then “+ Create deal” once they confirm.
          </p>
        )}
      </section>
    </div>
  );
}
