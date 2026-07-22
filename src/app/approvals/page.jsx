"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { getDeals, approveDealWin, rejectDealWin } from "@/lib/dealsApi";
import { getLeads } from "@/lib/leadsApi";
import { useCompConfig } from "@/lib/compConfig";
import { dscName } from "@/data/mockLeads";
import { findOffering, singleDealCommission } from "@/lib/commission";
import { formatINR, formatDate, discountPctLabel } from "@/lib/format";

// Approvals (Admin). A DSC's request to start a project on a deal lands here,
// grouped UNDER ITS LEAD so the Admin sees the prospect first, then every deal
// awaiting a decision — with pricing + commission. Approving credits the deal
// (moves it to Project Started + stamps wonApprovedDate) so it counts toward the
// DSC's target + commission; Rejecting returns it with a reason to revise.
const ADMIN_ID = "u-admin"; // demo decider; real auth supplies the logged-in Admin

function money(n) {
  return formatINR(Math.round(n || 0));
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ApprovalsPage() {
  const { config } = useCompConfig();
  const [deals, setDeals] = useState([]);
  const [leadsById, setLeadsById] = useState({});
  const [loading, setLoading] = useState(true);
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
    () => deals.filter((d) => d.approvalStatus === "pending"),
    [deals]
  );

  // Group the pending deals under their lead (prospect), newest-requested first.
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

  const decided = useMemo(
    () =>
      deals
        .filter(
          (d) =>
            d.approvalStatus === "approved" || d.approvalStatus === "rejected"
        )
        .sort((a, b) =>
          (b.approvalDecidedDate || "").localeCompare(
            a.approvalDecidedDate || ""
          )
        )
        .slice(0, 8),
    [deals]
  );

  function offeringName(id) {
    return findOffering(config, id)?.name || "Unknown offering";
  }

  async function accept(deal) {
    await approveDealWin(deal.dealId, {
      adminId: ADMIN_ID,
      approvedDate: todayISO(),
    });
    load();
  }
  async function confirmReject(deal) {
    await rejectDealWin(deal.dealId, {
      adminId: ADMIN_ID,
      reason: reason.trim() || "No reason given",
      decidedDate: todayISO(),
    });
    setRejectingId(null);
    setReason("");
    load();
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Approvals"
        subtitle="Admin — review deal requests to start a project. Approving credits the deal to the DSC."
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {/* Pending — grouped by lead */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            Pending
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {pending.length} deal{pending.length === 1 ? "" : "s"}
            </span>
            {pendingByLead.length ? (
              <span className="text-xs font-normal text-slate-400">
                across {pendingByLead.length} lead
                {pendingByLead.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </h3>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
          ) : pending.length === 0 ? (
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
                  {/* Lead header */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {group.company}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {group.leadId}
                      </span>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {group.deals.length} pending
                    </span>
                  </div>

                  {/* Each pending deal under this lead */}
                  <div className="divide-y divide-slate-100">
                    {group.deals.map((deal) => {
                      const req = deal.approvalRequest || {};
                      const preview = {
                        offeringId: deal.offeringId,
                        closedAmount: req.closedAmount ?? deal.closedAmount,
                      };
                      const dscComm = singleDealCommission(
                        preview,
                        config,
                        "dsc"
                      );
                      const bdmComm = singleDealCommission(
                        preview,
                        config,
                        "bdm"
                      );
                      return (
                        <div key={deal.dealId} className="px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">
                                  {offeringName(deal.offeringId)}
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                                  → {req.requestedStatus || "Project Started"}
                                </span>
                                <span className="font-mono text-xs text-slate-400">
                                  {deal.dealId}
                                </span>
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                Requested by{" "}
                                <span className="font-medium text-slate-700">
                                  {dscName(req.requestedBy || deal.ownerId)}
                                </span>{" "}
                                · {formatDate(req.requestedDate)}
                              </div>
                            </div>
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
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Figure
                              label="Pitched"
                              value={money(req.quotedAmount)}
                            />
                            <Figure
                              label="Finalized"
                              value={money(req.closedAmount)}
                            />
                            <Figure
                              label="Discount"
                              value={discountPctLabel({
                                quotedAmount: req.quotedAmount,
                                closedAmount: req.closedAmount,
                              })}
                            />
                            <Figure
                              label="Commission (DSC / BDM)"
                              value={`${money(dscComm)} / ${money(bdmComm)}`}
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
                                Reason for rejection
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
                                  onClick={() => confirmReject(deal)}
                                  className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
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
          )}
        </section>

        {/* Recently decided */}
        {decided.length ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Recently decided
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Company</th>
                    <th className="px-4 py-2 font-semibold">Offering</th>
                    <th className="px-4 py-2 font-semibold">DSC</th>
                    <th className="px-4 py-2 font-semibold">Decision</th>
                    <th className="px-4 py-2 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {decided.map((deal) => (
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
                        {deal.approvalStatus === "approved" ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Approved
                          </span>
                        ) : (
                          <span
                            className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                            title={deal.approvalReason}
                          >
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {formatDate(deal.approvalDecidedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Figure({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
