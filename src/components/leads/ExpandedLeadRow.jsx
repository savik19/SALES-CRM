"use client";

import { COLUMN_GROUPS } from "./columns";
import {
  LEAD_STATUSES,
  PRIORITIES,
  LEAD_SOURCES,
  INDUSTRIES,
  LOST_REASONS,
  SERVICES,
  DSCS,
} from "@/data/mockLeads";
import { discountPctLabel } from "@/lib/format";

// Field type + options, derived from the column key.
function fieldConfig(key) {
  switch (key) {
    case "leadId":
      return { type: "readonly" };
    case "discountPct":
      return { type: "computed" };
    case "industry":
      return { type: "select", options: INDUSTRIES };
    case "leadSource":
      return { type: "select", options: LEAD_SOURCES };
    case "leadStatus":
      return { type: "select", options: LEAD_STATUSES };
    case "priority":
      return { type: "select", options: PRIORITIES };
    case "lostReason":
      return { type: "select", options: ["", ...LOST_REASONS] };
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
    case "quotedAmount":
    case "closedAmount":
      return { type: "number" };
    case "notes":
      return { type: "textarea" };
    default:
      return { type: "text" };
  }
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-100 disabled:text-slate-500";

// One editable (or read-only) field.
function Field({ column, lead, canEdit, canAssign, onChange }) {
  const key = column.key;
  const cfg = fieldConfig(key);
  const value = lead[key];
  const set = (v) => onChange(lead.leadId, { [key]: v });

  // Assigned DSC is editable only by the BDM.
  const editable =
    cfg.type === "readonly" || cfg.type === "computed"
      ? false
      : key === "assignedDscId"
        ? canAssign
        : canEdit;

  let control;
  if (cfg.type === "computed") {
    control = <span className="text-slate-700">{discountPctLabel(lead)}</span>;
  } else if (cfg.type === "readonly") {
    control = <span className="font-mono text-slate-600">{value}</span>;
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
        {DSCS.map((d) => (
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

  return (
    <div>
      <label className="mb-0.5 block text-xs font-medium text-slate-500">
        {column.label}
      </label>
      {control}
    </div>
  );
}

// Inline expanded view — every field for a lead, grouped, edited in place.
// Editability follows the role: DSC edits their own leads' fields (but not the
// assignee); BDM edits anything and is the only one who can (re)assign.
export default function ExpandedLeadRow({ lead, role, onChange }) {
  const canEdit = true; // a viewer only ever sees leads they may edit
  const canAssign = role === "bdm";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-xs text-slate-400">{lead.leadId}</span>
        <span className="text-sm font-semibold text-slate-900">
          {lead.company}
        </span>
      </div>
      <div className="space-y-4">
        {COLUMN_GROUPS.map((group) => (
          <div key={group.name}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.name}
            </h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {group.columns.map((col) => (
                <Field
                  key={col.key}
                  column={col}
                  lead={lead}
                  canEdit={canEdit}
                  canAssign={canAssign}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
