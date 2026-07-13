"use client";

import { StatusBadge, PriorityBadge } from "./LeadStatusBadge";
import ServiceChips from "./ServiceChips";
import { dscName } from "@/data/mockLeads";
import {
  formatDate,
  formatINR,
  orDash,
  discountPctLabel,
  isOnOrBefore,
} from "@/lib/format";

function SortArrow({ direction }) {
  if (!direction) return <span className="text-slate-300">↕</span>;
  return <span className="text-brand">{direction === "asc" ? "↑" : "↓"}</span>;
}

// Render one cell based on the column key. Presentational only.
function Cell({ column, lead }) {
  const key = column.key;
  const value = lead[key];

  switch (key) {
    case "company":
      return <span className="font-medium text-slate-900">{lead.company}</span>;
    case "leadId":
      return (
        <span className="font-mono text-xs text-slate-500">{lead.leadId}</span>
      );
    case "leadStatus":
      return <StatusBadge status={lead.leadStatus} />;
    case "priority":
      return <PriorityBadge priority={lead.priority} />;
    case "assignedDscId":
      return (
        <span className="whitespace-nowrap">{dscName(lead.assignedDscId)}</span>
      );
    case "servicesPitched":
    case "servicesInterested":
    case "servicesOnboarded":
      return <ServiceChips values={value} />;
    case "quotedAmount":
    case "closedAmount":
      return (
        <span className="whitespace-nowrap tabular-nums">
          {formatINR(value)}
        </span>
      );
    case "discountPct":
      return <span className="tabular-nums">{discountPctLabel(lead)}</span>;
    case "attemptCount":
      return <span className="tabular-nums">{value ?? 0}</span>;
    case "lastContactDate":
      return <span className="whitespace-nowrap">{formatDate(value)}</span>;
    case "nextFollowUpDate": {
      const overdue = isOnOrBefore(value);
      return (
        <span
          className={`whitespace-nowrap ${overdue ? "font-medium text-red-600" : ""}`}
          title={overdue ? "Follow-up due" : undefined}
        >
          {formatDate(value)}
          {overdue ? " •" : ""}
        </span>
      );
    }
    case "website":
    case "linkedinUrl": {
      if (!value) return <span className="text-slate-400">—</span>;
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-brand hover:underline"
        >
          {value.replace(/^https?:\/\//, "")}
        </a>
      );
    }
    case "notes":
      return (
        <span className="block max-w-xs truncate text-slate-600" title={value}>
          {orDash(value)}
        </span>
      );
    default:
      return <span className="text-slate-600">{orDash(value)}</span>;
  }
}

// Presentational table — does NOT fetch or filter. Parent passes the already
// filtered + sorted `leads`, the ordered `columns` to show, and sort handlers.
export default function LeadTable({
  leads,
  columns,
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
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600"
              >
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  {col.label}
                  <SortArrow direction={sortBy === col.key ? sortDir : null} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const selected = lead.leadId === selectedId;
            return (
              <tr
                key={lead.leadId}
                onClick={() => onRowClick(lead)}
                className={`cursor-pointer border-b border-slate-100 transition-colors ${
                  selected ? "bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 align-top text-slate-700"
                  >
                    <Cell column={col} lead={lead} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
