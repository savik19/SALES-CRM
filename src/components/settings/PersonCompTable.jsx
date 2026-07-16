"use client";

import { fieldsForRole } from "@/lib/compConfig";

// ---------------------------------------------------------------------------
// Per-person compensation table. Lists every active BDM/DSC with their
// EFFECTIVE package (role default merged with any override) and lets the Admin
// customize or reset an individual. Reads from the working `draft` config so it
// updates live as overrides are edited (before Update is pressed).
// ---------------------------------------------------------------------------

function effective(draft, role, userId) {
  const base = role === "bdm" ? draft.bdm : draft.dsc;
  const override = (draft.overrides && draft.overrides[userId]) || {};
  return { comp: { ...base, ...override }, override };
}

function money(v) {
  return v === null || v === undefined
    ? "—"
    : `₹${Number(v).toLocaleString("en-IN")}`;
}

export default function PersonCompTable({ users, draft, onEdit, onReset }) {
  const people = users
    .filter((u) => u.role === "bdm" || u.role === "dsc")
    .filter((u) => u.status !== "deactivated")
    .sort(
      (a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)
    );

  if (people.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
        No active team members yet. Add BDMs and DSCs in User Management.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Person</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Salary / mo</th>
              <th className="px-4 py-2.5">Commission</th>
              <th className="px-4 py-2.5">Target</th>
              <th className="px-4 py-2.5">Package</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((u) => {
              const { comp, override } = effective(draft, u.role, u.id);
              const overridden = Object.keys(override).length > 0;
              const salary =
                u.role === "bdm" ? comp.salaryMonthly : comp.baseSalaryMonthly;
              const overriddenFields = fieldsForRole(u.role).filter(
                (f) => override[f] !== undefined
              );
              return (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {u.name}
                  </td>
                  <td className="px-4 py-2.5 uppercase text-slate-500">
                    {u.role}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">
                    {money(salary)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">
                    {comp.commissionPct}%
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">
                    {comp.monthlyLeadTarget}
                  </td>
                  <td className="px-4 py-2.5">
                    {overridden ? (
                      <span
                        className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                        title={`Custom: ${overriddenFields.join(", ")}`}
                      >
                        Custom · {overriddenFields.length}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(u)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Customize
                      </button>
                      {overridden ? (
                        <button
                          type="button"
                          onClick={() => onReset(u.id)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
                        >
                          Reset
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
