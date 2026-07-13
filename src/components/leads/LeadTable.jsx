"use client";

import { Fragment } from "react";
import { StatusBadge, PriorityBadge } from "./LeadStatusBadge";
import ServiceChips from "./ServiceChips";
import ExpandableCell from "./ExpandableCell";
import { dscName } from "@/data/mockLeads";
import {
  formatDate,
  formatINR,
  discountPctLabel,
  isOnOrBefore,
} from "@/lib/format";

function SortArrow({ direction }) {
  if (!direction) return <span className="text-slate-300">↕</span>;
  return <span className="text-brand">{direction === "asc" ? "↑" : "↓"}</span>;
}

// Render one cell based on the column key. Long/among-many values truncate and
// expand on click (ExpandableCell); the layout never breaks. Company and Lead Id
// are clickable and open the detail sidebar.
function Cell({ column, lead, onOpenDetail }) {
  const key = column.key;
  const value = lead[key];

  switch (key) {
    case "company":
      return (
        <button
          type="button"
          title={lead.company}
          onClick={() => onOpenDetail(lead)}
          className="block w-full truncate text-left font-medium text-brand hover:underline"
        >
          {lead.company || "—"}
        </button>
      );
    case "leadId":
      return (
        <button
          type="button"
          onClick={() => onOpenDetail(lead)}
          className="font-mono text-xs text-slate-500 hover:text-brand hover:underline"
        >
          {lead.leadId}
        </button>
      );
    case "leadStatus":
      return <StatusBadge status={lead.leadStatus} />;
    case "priority":
      return <PriorityBadge priority={lead.priority} />;
    case "assignedDscId":
      return value ? (
        <span className="truncate">{dscName(value)}</span>
      ) : (
        <span className="italic text-slate-400">Unassigned</span>
      );
    case "servicesPitched":
    case "servicesInterested":
    case "servicesOnboarded":
      return <ServiceChips values={value} />;
    case "quotedAmount":
    case "closedAmount":
      return <span className="tabular-nums">{formatINR(value)}</span>;
    case "discountPct":
      return <span className="tabular-nums">{discountPctLabel(lead)}</span>;
    case "attemptCount":
      return <span className="tabular-nums">{value ?? 0}</span>;
    case "lastContactDate":
      return <span>{formatDate(value)}</span>;
    case "nextFollowUpDate": {
      const overdue = isOnOrBefore(value);
      return (
        <span
          className={overdue ? "font-medium text-red-600" : ""}
          title={overdue ? "Follow-up due" : undefined}
        >
          {formatDate(value)}
          {overdue ? " •" : ""}
        </span>
      );
    }
    case "website":
    case "linkedinUrl":
      return <ExpandableCell text={value} className="text-brand" />;
    default:
      return <ExpandableCell text={value} />;
  }
}

// Drag-to-resize handle on a column's right edge.
function ResizeHandle({ onResize, width }) {
  function onPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = width;
    function move(ev) {
      onResize(Math.max(80, startW + (ev.clientX - startX)));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  return (
    <span
      onPointerDown={onPointerDown}
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-brand/40"
      title="Drag to resize"
    />
  );
}

// Presentational table. Fixed layout + per-column widths so cells truncate
// cleanly and columns are resizable. Does NOT fetch, filter, or sort.
export default function LeadTable({
  leads,
  columns,
  widths,
  onResize,
  sortBy,
  sortDir,
  onSort,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  expandedId,
  onToggleExpand,
  renderExpanded,
  onOpenDetail,
}) {
  const totalCols = columns.length + 1 + (selectable ? 1 : 0);

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
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: 40 }} />
          {selectable ? <col style={{ width: 40 }} /> : null}
          {columns.map((col) => (
            <col
              key={col.key}
              style={{ width: widths[col.key] || col.width }}
            />
          ))}
        </colgroup>

        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-2 py-3" />
            {selectable ? (
              <th className="px-2 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  aria-label="Select all"
                />
              </th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="relative px-4 py-3 font-semibold text-slate-600"
              >
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-slate-900"
                >
                  <span className="truncate">{col.label}</span>
                  <SortArrow direction={sortBy === col.key ? sortDir : null} />
                </button>
                <ResizeHandle
                  width={widths[col.key] || col.width}
                  onResize={(w) => onResize(col.key, w)}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => {
            const selected = selectedIds?.has(lead.leadId);
            const isExpanded = expandedId === lead.leadId;
            return (
              <Fragment key={lead.leadId}>
                <tr
                  className={`border-b border-slate-100 ${
                    selected ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-2 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => onToggleExpand(lead.leadId)}
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      aria-label={isExpanded ? "Collapse row" : "Expand row"}
                    >
                      <span
                        className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      >
                        ▸
                      </span>
                    </button>
                  </td>
                  {selectable ? (
                    <td className="px-2 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => onToggleSelect(lead.leadId)}
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        aria-label={`Select ${lead.company}`}
                      />
                    </td>
                  ) : null}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="overflow-hidden px-4 py-3 align-top text-slate-700"
                    >
                      <Cell
                        column={col}
                        lead={lead}
                        onOpenDetail={onOpenDetail}
                      />
                    </td>
                  ))}
                </tr>
                {isExpanded ? (
                  <tr className="bg-slate-50/60">
                    <td colSpan={totalCols} className="px-6 py-4">
                      {renderExpanded(lead)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
