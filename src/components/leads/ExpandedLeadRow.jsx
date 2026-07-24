"use client";

import {
  PRIORITIES,
  LEAD_SOURCES,
  INDUSTRIES,
  SERVICES,
} from "@/data/mockLeads";
import { MANUAL_LEAD_STATUSES, LEAD_STATUS, labelOf } from "@/lib/statuses";
import { formatINR } from "@/lib/format";
import { useActiveDscs, useUsers } from "@/lib/usersConfig";

// Manual lead-status options for a lead (derived statuses are never selectable).
// Uses the lead's computed deal counts to gate `lost` (blocked when the lead has
// any approved deal — started + delivered) and locks everything once it is Won.
function statusOptionsFor(lead) {
  const approved = (lead.dealsStarted || 0) + (lead.dealsDelivered || 0);
  const locked = (lead.derivedStatus || lead.leadStatus) === LEAD_STATUS.WON;
  const opts = MANUAL_LEAD_STATUSES.map((v) => ({
    value: v,
    label: labelOf(v),
    disabled: locked,
  }));
  opts.push({
    value: LEAD_STATUS.LOST,
    label: labelOf(LEAD_STATUS.LOST),
    disabled: locked || approved > 0,
  });
  return { options: opts, locked };
}

// Field type + options, derived from the column key. (Money fields — quoted,
// closed, discount, lost reason — moved to the Deal, so they're no longer here.)
function fieldConfig(key) {
  switch (key) {
    case "leadId":
      return { type: "readonly" };
    case "industry":
      return { type: "select", options: INDUSTRIES };
    case "leadSource":
      return { type: "select", options: LEAD_SOURCES };
    case "leadStatus":
      return { type: "status" };
    case "dealsTotal":
    case "dealsLive":
    case "dealsStarted":
    case "dealsDelivered":
    case "wonValue":
      return { type: "computed" };
    case "priority":
      return { type: "select", options: PRIORITIES };
    case "assignedDscId":
      return { type: "dsc" };
    case "servicesPitched":
    case "servicesInterested":
    case "servicesOnboarded":
      return { type: "services" };
    case "lastContactDate":
    case "nextFollowUpDate":
      return { type: "date" };
    case "attemptCount":
      return { type: "number" };
    case "notes":
      return { type: "textarea" };
    default:
      return { type: "text" };
  }
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-100 disabled:text-slate-500";

// Fields that read better spanning the full width of the grid.
const WIDE_FIELDS = new Set([
  "notes",
  "servicesPitched",
  "servicesInterested",
  "servicesOnboarded",
]);

// One editable (or read-only) field.
function Field({ column, lead, canEdit, canAssign, onChange, dscs }) {
  const key = column.key;
  const cfg = fieldConfig(key);
  const value = lead[key];
  const set = (v) => onChange(lead.leadId, { [key]: v });

  // Assigned DSC is editable only by the BDM.
  const editable =
    cfg.type === "readonly"
      ? false
      : key === "assignedDscId"
        ? canAssign
        : canEdit;

  let control;
  if (cfg.type === "readonly") {
    control = <span className="font-mono text-slate-600">{value}</span>;
  } else if (cfg.type === "computed") {
    control = (
      <span className="text-sm text-slate-700">
        {key === "wonValue" ? (value ? formatINR(value) : "—") : (value ?? 0)}
      </span>
    );
  } else if (cfg.type === "status") {
    const { options, locked } = statusOptionsFor(lead);
    control = (
      <select
        className={inputClass}
        value={lead.leadStatus || ""}
        disabled={!canEdit || locked}
        onChange={(e) => set(e.target.value)}
        title={
          locked
            ? "This lead is Won (has an approved deal) — status locked."
            : ""
        }
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (cfg.type === "select") {
    control = (
      <select
        className={inputClass}
        value={value || ""}
        disabled={!editable}
        onChange={(e) => set(e.target.value)}
      >
        {cfg.options.map((o) => (
          <option key={o || "—"} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
    );
  } else if (cfg.type === "dsc") {
    control = (
      <select
        className={inputClass}
        value={value || ""}
        disabled={!editable}
        onChange={(e) => set(e.target.value)}
      >
        <option value="">Unassigned</option>
        {dscs.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    );
  } else if (cfg.type === "services") {
    control = (
      <div className="flex flex-wrap gap-1">
        {SERVICES.map((s) => {
          const on = (value || []).includes(s);
          return (
            <button
              key={s}
              type="button"
              disabled={!editable}
              onClick={() =>
                set(on ? value.filter((v) => v !== s) : [...(value || []), s])
              }
              className={`rounded px-1.5 py-0.5 text-xs ${
                on
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } ${!editable ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {s}
            </button>
          );
        })}
      </div>
    );
  } else if (cfg.type === "date") {
    control = (
      <input
        type="date"
        className={inputClass}
        value={value || ""}
        disabled={!editable}
        onChange={(e) => set(e.target.value)}
      />
    );
  } else if (cfg.type === "number") {
    control = (
      <input
        type="number"
        className={inputClass}
        value={value ?? ""}
        disabled={!editable}
        onChange={(e) =>
          set(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    );
  } else if (cfg.type === "textarea") {
    control = (
      <textarea
        rows={2}
        className={inputClass}
        value={value || ""}
        disabled={!editable}
        onChange={(e) => set(e.target.value)}
      />
    );
  } else {
    control = (
      <input
        type="text"
        className={inputClass}
        value={value || ""}
        disabled={!editable}
        onChange={(e) => set(e.target.value)}
      />
    );
  }

  const wide = WIDE_FIELDS.has(key);
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {column.label}
      </label>
      {control}
    </div>
  );
}

// Expanded lead detail — every field, grouped, edited in place. Rendered two
// ways: inline under a table row (`variant="inline"`, a constrained multi-column
// card) and inside the detail sidebar (`variant="sidebar"`, a clean single
// column with no card chrome/header — the sidebar supplies those).
// Editability follows the role: DSC edits their own leads' fields (but not the
// assignee); BDM edits anything and is the only one who can (re)assign.
export default function ExpandedLeadRow({
  lead,
  canEdit = false,
  canAssign = false,
  onChange,
  groups,
  variant = "inline",
}) {
  // `canEdit` = may edit this lead's fields; `canAssign` = may (re)assign it.
  // Both are decided by the page from the role + focus (see the permission model
  // in app/leads/page.jsx). A read-only lead has both false.
  const sidebar = variant === "sidebar";

  // Assignable DSCs = active DSCs, plus the lead's current assignee if they've
  // since been deactivated (so the name still renders and isn't silently lost).
  const activeDscs = useActiveDscs();
  const { users } = useUsers();
  const dscs = (() => {
    if (!lead?.assignedDscId) return activeDscs;
    if (activeDscs.some((d) => d.id === lead.assignedDscId)) return activeDscs;
    const current = users.find((u) => u.id === lead.assignedDscId);
    return current ? [...activeDscs, current] : activeDscs;
  })();

  const gridClass = sidebar
    ? "grid grid-cols-1 gap-x-4 gap-y-3"
    : "grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3";

  const container = sidebar
    ? ""
    : "max-w-5xl rounded-lg border border-slate-200 bg-white p-5";

  return (
    <div className={container}>
      {!sidebar ? (
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="font-mono text-xs text-slate-400">
            {lead.leadId}
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {lead.company}
          </span>
        </div>
      ) : null}

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.name}>
            <h4 className="mb-2 border-b border-slate-100 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.name}
            </h4>
            <div className={gridClass}>
              {group.columns.map((col) => (
                <Field
                  key={col.key}
                  column={col}
                  lead={lead}
                  canEdit={canEdit}
                  canAssign={canAssign}
                  onChange={onChange}
                  dscs={dscs}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
