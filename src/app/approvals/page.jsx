"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import {
  getDeals,
  approveDeal,
  rejectDeal,
  deliverDeal,
  reverseDeal,
} from "@/lib/dealsApi";
import { getLeads } from "@/lib/leadsApi";
import { useCompConfig } from "@/lib/compConfig";
import { useUsers } from "@/lib/usersConfig";
import { dscName, USER_BY_ID } from "@/data/mockLeads";
import { findOffering, singleDealCommission } from "@/lib/commission";
import { canApprove, can } from "@/lib/permissions";
import { DEAL_APPROVAL, DEAL_STAGE } from "@/lib/statuses";
import { formatINR, formatDate, discountPct, discountPctLabel } from "@/lib/format";

// Approvals (Admin). A DSC's request to start a project lands here, grouped under
// its lead. Approving credits the deal (stage → Project Started, commission
// accrued). The Approved tab lets the Admin Set Delivered (release commission) or
// Reverse (claw it back). The BDM sees the queue READ-ONLY — approval is the
// money control and the BDM is compensated on team sales, a conflict of interest.
function money(n) {
  return formatINR(Math.round(n || 0));
}

export default function ApprovalsPage() {
  const { config } = useCompConfig();
  const { users } = useUsers();
  const [viewerId, setViewerId] = useState("u-admin");
  const viewer = users.find((u) => u.id === viewerId) || USER_BY_ID[viewerId];
  const actor = { id: viewer?.id, role: viewer?.role };
  const isAdmin = canApprove(viewer);
  const canView = isAdmin || can(viewer, "view_approvals");

  const [deals, setDeals] = useState([]);
  const [leadsById, setLeadsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending"); // "pending" | "approved"
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  function load() {
    setLoading(true);
    Promise.all([getDeals(), getLeads()]).then(([dealRows, leads]) => {
      const map = {};
      for (const l of leads) map[l.leadId] = l;
      setLeadsById(map);
      setDeals(dealRows);
      setLoading(false);
    });
  }
  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(
    () => deals.filter((d) => d.approval === DEAL_APPROVAL.PENDING),
    [deals]
  );
  const approved = useMemo(
    () =>
      deals
        .filter((d) => d.approval === DEAL_APPROVAL.APPROVED)
        .sort((a, b) =>
          (b.wonApprovedDate || "").localeCompare(a.wonApprovedDate || "")
        ),
    [deals]
  );

  const pendingByLead = useMemo(() => {
    const groups = new Map();
    for (const d of pending) {
      if (!groups.has(d.leadId)) groups.set(d.leadId, []);
      groups.get(d.leadId).push(d);
    }
    return [...groups.entries()].map(([leadId, ds]) => ({
      leadId,
      company: leadsById[leadId]?.company || ds[0].companyId || "—",
      deals: ds,
    }));
  }, [pending, leadsById]);

  function offeringName(id) {
    return findOffering(config, id)?.name || "Unknown offering";
  }

  // Effective final amount used for pricing (request snapshot, else the deal).
  function finalOf(deal) {
    const req = deal.approvalRequest || {};
    return req.finalAmount ?? deal.finalAmount;
  }
  function commissionToCredit(deal) {
    return singleDealCommission(
      { offeringId: deal.offeringId, finalAmount: finalOf(deal) },
      config,
      "dsc"
    );
  }

  async function accept(deal) {
    if (!isAdmin) return;
    await approveDeal(deal.dealId, { actor, config });
    load();
  }
  async function acceptGroup(group) {
    if (!isAdmin) return;
    for (const d of group.deals) {
      // eslint-disable-next-line no-await-in-loop
      await approveDeal(d.dealId, { actor, config });
    }
    load();
  }
  async function confirmReject(deal) {
    if (!isAdmin) return;
    await rejectDeal(deal.dealId, {
      actor,
      reason: reason.trim() || "No reason given",
    });
    setRejectingId(null);
    setReason("");
    load();
  }
  async function deliver(deal) {
    if (!isAdmin) return;
    await deliverDeal(deal.dealId, { actor, config });
    load();
  }
  async function reverse(deal) {
    if (!isAdmin) return;
    const r = window.prompt("Reason for reversing this approved deal:");
    if (!r || !r.trim()) return;
    await reverseDeal(deal.dealId, { actor, config, reason: r.trim() });
    load();
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Approvals"
        subtitle={
          isAdmin
            ? "Review deal requests to start a project. Approving accrues the DSC's commission."
            : "Read-only — only the Admin can approve (money control)."
        }
        right={<RoleSwitcher viewerId={viewerId} onChange={setViewerId} />}
      />

      {!canView ? (
        <div className="px-6 py-20 text-center text-sm text-slate-500">
          You don&apos;t have access to the approvals queue.
        </div>
      ) : (
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5">
            {[
              { key: "pending", label: `Pending (${pending.length})` },
              { key: "approved", label: `Approved (${approved.length})` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
          ) : tab === "pending" ? (
            pending.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                No pending approvals. New requests from DSCs appear here.
              </p>
            ) : (
              <div className="space-y-4">
                {pendingByLead.map((group) => (
                  <div
                    key={group.leadId}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {group.company}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {group.leadId}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {group.deals.length} pending
                        </span>
                      </div>
                      {isAdmin && group.deals.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => acceptGroup(group)}
                          className="rounded-lg border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                        >
                          Approve all
                        </button>
                      ) : null}
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.deals.map((deal) => {
                        const req = deal.approvalRequest || {};
                        const disc = discountPct({
                          quotedAmount: req.quotedAmount ?? deal.quotedAmount,
                          finalAmount: finalOf(deal),
                        });
                        const bigDiscount = disc != null && disc > 20;
                        return (
                          <div key={deal.dealId} className="px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-800">
                                    {offeringName(deal.offeringId)}
                                  </span>
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                                    → Project Started
                                  </span>
                                  <span className="font-mono text-xs text-slate-400">
                                    {deal.dealId}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-xs text-slate-500">
                                  Owner (gets paid){" "}
                                  <span className="font-medium text-slate-700">
                                    {dscName(req.requestedBy || deal.ownerId)}
                                  </span>{" "}
                                  · requested {formatDate(req.requestedDate)}
                                </div>
                              </div>
                              {isAdmin ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => accept(deal)}
                                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingId(deal.dealId);
                                      setReason("");
                                    }}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs italic text-slate-400">
                                  Awaiting Admin
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <Figure
                                label="Pitched"
                                value={money(req.quotedAmount ?? deal.quotedAmount)}
                              />
                              <Figure label="Final" value={money(finalOf(deal))} />
                              <Figure
                                label="Discount"
                                value={discountPctLabel({
                                  quotedAmount:
                                    req.quotedAmount ?? deal.quotedAmount,
                                  finalAmount: finalOf(deal),
                                })}
                                tone={bigDiscount ? "amber" : "slate"}
                              />
                              <Figure
                                label="Commission to credit"
                                value={money(commissionToCredit(deal))}
                                tone="brand"
                              />
                            </div>

                            {req.note ? (
                              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                “{req.note}”
                              </p>
                            ) : null}

                            {rejectingId === deal.dealId ? (
                              <div className="mt-3 rounded-lg border border-slate-200 p-3">
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                  Reason for rejection (required)
                                </label>
                                <textarea
                                  rows={2}
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                  placeholder="Why is this being sent back?"
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setRejectingId(null)}
                                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!reason.trim()}
                                    onClick={() => confirmReject(deal)}
                                    className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Confirm reject
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : approved.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No approved deals yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Company</th>
                    <th className="px-4 py-2 font-semibold">Offering</th>
                    <th className="px-4 py-2 font-semibold">Owner</th>
                    <th className="px-4 py-2 font-semibold">Stage</th>
                    <th className="px-4 py-2 text-right font-semibold">Final</th>
                    <th className="px-4 py-2 font-semibold">Approved</th>
                    {isAdmin ? (
                      <th className="px-4 py-2 font-semibold">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {approved.map((deal) => (
                    <tr key={deal.dealId} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {leadsById[deal.leadId]?.company ||
                          deal.companyId ||
                          "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {offeringName(deal.offeringId)}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {dscName(deal.ownerId)}
                      </td>
                      <td className="px-4 py-2">
                        {deal.stage === DEAL_STAGE.PROJECT_DELIVERED ? (
                          <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                            Delivered
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Started
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                        {money(deal.finalAmount)}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {formatDate(deal.wonApprovedDate)}
                      </td>
                      {isAdmin ? (
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            {deal.stage === DEAL_STAGE.PROJECT_STARTED ? (
                              <button
                                type="button"
                                onClick={() => deliver(deal)}
                                className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                              >
                                Set Delivered
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => reverse(deal)}
                              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Reverse
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Figure({ label, value, tone = "slate" }) {
  const tones = {
    slate: "text-slate-800",
    amber: "text-amber-600",
    brand: "text-brand-700",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold ${tones[tone]}`}>
        {value}
      </div>
    </div>
  );
}
