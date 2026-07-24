"use client";

import { dscName } from "@/data/mockLeads";
import { StageBadge, ApprovalBadge } from "@/components/leads/LeadStatusBadge";
import { formatINR, formatDate, discountPctLabel } from "@/lib/format";

// The tabular "Deals" view (Lead → Deal model) — the flat counterpart to the
// Pipeline Kanban. One row per deal with its status + money; the page owns
// filtering/sorting and passes the rows in. Clicking a row opens the deal detail.
// Columns are fixed (a focused, purpose-built table — not the configurable Lead
// Table), each header sortable.
const COLUMNS = [
  { key: "company", label: "Company", sort: "text", align: "left" },
  { key: "offeringName", label: "Offering", sort: "text", align: "left" },
  { key: "offeringKind", label: "Type", sort: "text", align: "left" },
  { key: "ownerId", label: "Owner", sort: "owner", align: "left" },
  { key: "stage", label: "Stage", sort: "text", align: "left" },
  { key: "quotedAmount", label: "Pitched", sort: "number", align: "right" },
  { key: "finalAmount", label: "Final", sort: "number", align: "right" },
  { key: "discount", label: "Discount", sort: "discount", align: "right" },
  { key: "approval", label: "Approval", sort: "text", align: "left" },
  { key: "paymentStatus", label: "Payment", sort: "text", align: "left" },
  { key: "createdDate", label: "Created", sort: "date", align: "left" },
];

export { COLUMNS as DEAL_COLUMNS };

function SortArrow({ direction }) {
  if (!direction) return <span className="text-slate-300">↕</span>;
  return <span className="text-brand">{direction === "asc" ? "↑" : "↓"}</span>;
}

function Cell({ column, deal }) {
  switch (column.key) {
    case "company":
      return <span className="font-medium text-slate-800">{deal.company}</span>;
    case "offeringName":
      return <span className="text-slate-700">{deal.offeringName}</span>;
    case "offeringKind":
      return (
        <span className="text-xs capitalize text-slate-500">
          {deal.offeringKind || "—"}
        </span>
      );
    case "ownerId":
      return deal.ownerId ? (
        <span className="text-slate-600">{dscName(deal.ownerId)}</span>
      ) : (
        <span className="italic text-slate-400">Unassigned</span>
      );
    case "stage":
      return <StageBadge stage={deal.stage} />;
    case "quotedAmount":
      return (
        <span className="tabular-nums text-slate-700">
          {deal.quotedAmount != null ? formatINR(deal.quotedAmount) : "—"}
        </span>
      );
    case "finalAmount":
      return (
        <span className="tabular-nums text-slate-700">
          {deal.finalAmount != null ? formatINR(deal.finalAmount) : "—"}
        </span>
      );
    case "discount":
      return (
        <span className="tabular-nums text-slate-600">
          {discountPctLabel(deal)}
        </span>
      );
    case "approval":
      return <ApprovalBadge approval={deal.approval} />;
    case "paymentStatus":
      return (
        <span className="text-xs text-slate-600">
          {deal.paymentStatus || "Pending"}
        </span>
      );
    case "createdDate":
      return (
        <span className="text-slate-600">{formatDate(deal.createdDate)}</span>
      );
    default:
      return null;
  }
}

export default function DealTable({ deals, sortBy, sortDir, onSort, onOpen }) {
  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-3xl">🧾</div>
        <p className="mt-3 text-sm font-medium text-slate-700">
          No deals match
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Try clearing the search or filters, or create a deal from a lead.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 font-semibold text-slate-600 ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className={`inline-flex items-center gap-1 hover:text-slate-900 ${
                    col.align === "right" ? "flex-row-reverse" : ""
                  }`}
                >
                  <span>{col.label}</span>
                  <SortArrow direction={sortBy === col.key ? sortDir : null} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr
              key={deal.dealId}
              onClick={() => onOpen(deal)}
              className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
            >
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 align-middle ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  <Cell column={col} deal={deal} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
