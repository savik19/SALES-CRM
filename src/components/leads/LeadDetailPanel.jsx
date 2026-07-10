"use client";

import { useEffect } from "react";
import LeadStatusBadge from "./LeadStatusBadge";
import { LEAD_STATUSES } from "@/data/statuses";
import { dscName } from "@/data/users";
import { formatDate, orDash } from "@/lib/format";

// One labelled field row in the detail body.
function Field({ label, children }) {
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

// Slide-over lead detail. Shows the FULL schema (Brief §5) — the table only
// shows a subset. Includes a status changer (Brief §2 pipeline) wired to the
// parent's `onChangeStatus`, which today calls the mock updateLead().
export default function LeadDetailPanel({ lead, onClose, onChangeStatus }) {
  // Close on Escape.
  useEffect(() => {
    if (!lead) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  const open = Boolean(lead);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
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
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {lead.company}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {orDash(lead.industry)} · {orDash(lead.location)}
                </p>
                <div className="mt-2">
                  <LeadStatusBadge statusKey={lead.status} />
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

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Status changer */}
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label
                  htmlFor="status-select"
                  className="text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  Change status
                </label>
                <select
                  id="status-select"
                  value={lead.status}
                  onChange={(e) => onChangeStatus(lead.id, e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <dl className="divide-y divide-slate-100">
                <Field label="Contact Person">
                  {orDash(lead.contactPerson)}
                </Field>
                <Field label="Designation">{orDash(lead.designation)}</Field>
                <Field label="Phone">{orDash(lead.phone)}</Field>
                <Field label="Email">{orDash(lead.email)}</Field>
                <Field label="Website">
                  {orDash(lead.website) === "—" ? (
                    "—"
                  ) : (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      {lead.website}
                    </a>
                  )}
                </Field>
                <Field label="Budget">{orDash(lead.budget)}</Field>
                <Field label="Assigned DSC">
                  {dscName(lead.assignedDscId)}
                </Field>
                <Field label="Source">{orDash(lead.source)}</Field>
                <Field label="Last Follow-up">
                  {formatDate(lead.lastFollowUp)}
                </Field>
                <Field label="Next Follow-up">
                  {formatDate(lead.nextFollowUp)}
                </Field>
                <Field label="Remarks">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {orDash(lead.remarks)}
                  </p>
                </Field>
              </dl>
            </div>

            {/* Footer note — reassignment etc. lands here once the API exists */}
            <div className="border-t border-slate-200 px-6 py-3 text-xs text-slate-400">
              {/* TODO(backend): edit/reassign actions wire to updateLead(). */}
              Lead {lead.id}
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
