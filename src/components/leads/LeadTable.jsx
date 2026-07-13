"use client";

import LeadStatusBadge from "./LeadStatusBadge";
import { dscName } from "@/data/users";
import { formatDate, orDash, isFollowUpDue } from "@/lib/format";

// Columns rendered in the table. `sortKey` marks a column as sortable and names
// the lead field it sorts on. The full field set lives in the detail panel.
const COLUMNS = [
  { key: "company", label: "Company", sortKey: "company" },
  { key: "industry", label: "Industry", sortKey: "industry" },
  { key: "contactPerson", label: "Contact", sortKey: "contactPerson" },
  { key: "location", label: "Location", sortKey: "location" },
  { key: "status", label: "Status", sortKey: "status" },
  { key: "budget", label: "Budget", sortKey: "budget" },
  { key: "assignedDscId", label: "Assigned DSC", sortKey: "assignedDscId" },
  { key: "nextFollowUp", label: "Next Follow-up", sortKey: "nextFollowUp" },
];

function SortArrow({ direction }) {
  if (!direction) return <span className="text-slate-300">↕</span>;
  return <span className="text-brand">{direction === "asc" ? "↑" : "↓"}</span>;
}

// Presentational table — it does NOT fetch. Parent passes `leads` plus sort
// state + handlers, mapping cleanly onto a future GET /api/leads response.
export default function LeadTable({
  leads,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
  selectedId,
}) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-3xl">🗂️</div>
        <p className="mt-3 text-sm font-medium text-slate-700">
          No leads match
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Try clearing the search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600"
              >
                {col.sortKey ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.sortKey)}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    {col.label}
                    <SortArrow
                      direction={sortBy === col.sortKey ? sortDir : null}
                    />
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const due = isFollowUpDue(lead.nextFollowUp);
            const selected = lead.id === selectedId;
            return (
              <tr
                key={lead.id}
                onClick={() => onRowClick(lead)}
                className={`cursor-pointer border-b border-slate-100 transition-colors ${
                  selected ? "bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {lead.company}
                  </div>
                  <div className="text-xs text-slate-400">{lead.id}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {orDash(lead.industry)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{orDash(lead.contactPerson)}</div>
                  {lead.designation ? (
                    <div className="text-xs text-slate-400">
                      {lead.designation}
                    </div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {orDash(lead.location)}
                </td>
                <td className="px-4 py-3">
                  <LeadStatusBadge statusKey={lead.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {orDash(lead.budget)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {dscName(lead.assignedDscId)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={
                      due ? "font-medium text-red-600" : "text-slate-600"
                    }
                    title={due ? "Follow-up due" : undefined}
                  >
                    {formatDate(lead.nextFollowUp)}
                    {due ? " •" : ""}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
