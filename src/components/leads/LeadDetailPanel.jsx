"use client";

import { useEffect } from "react";
import { StatusBadge, PriorityBadge } from "./LeadStatusBadge";
import ServiceChips from "./ServiceChips";
import { COLUMN_GROUPS } from "./columns";
import { dscName } from "@/data/mockLeads";
import { formatDate, formatINR, orDash, discountPctLabel } from "@/lib/format";

// Full value for one field in the detail view (no truncation).
function fieldValue(key, lead) {
  const value = lead[key];
  switch (key) {
    case "leadStatus":
      return <StatusBadge status={lead.leadStatus} />;
    case "priority":
      return <PriorityBadge priority={lead.priority} />;
    case "assignedDscId":
      return dscName(lead.assignedDscId);
    case "servicesPitched":
    case "servicesInterested":
    case "servicesOnboarded":
      return <ServiceChips values={value} max={99} />;
    case "quotedAmount":
    case "closedAmount":
      return formatINR(value);
    case "discountPct":
      return discountPctLabel(lead);
    case "attemptCount":
      return value ?? 0;
    case "lastContactDate":
    case "nextFollowUpDate":
      return formatDate(value);
    case "website":
    case "linkedinUrl":
      return orDash(value) === "—" ? (
        "—"
      ) : (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="break-all text-brand hover:underline"
        >
          {value}
        </a>
      );
    default:
      return orDash(value);
  }
}

// Simple slide-over showing every field for a lead, grouped by section.
export default function LeadDetailPanel({ lead, onClose }) {
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
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-200 ${
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
                  {lead.company}
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
              {COLUMN_GROUPS.map((group) => (
                <div key={group.name} className="mb-5">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group.name}
                  </h3>
                  <dl className="divide-y divide-slate-100">
                    {group.columns.map((col) => (
                      <div key={col.key} className="flex gap-4 py-2 text-sm">
                        <dt className="w-40 shrink-0 text-slate-500">
                          {col.label}
                        </dt>
                        <dd className="min-w-0 flex-1 text-slate-800">
                          {fieldValue(col.key, lead)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
