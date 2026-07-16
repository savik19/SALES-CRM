"use client";

import { useEffect, useState } from "react";
import { fieldsForRole, FIELD_META } from "@/lib/compConfig";

// ---------------------------------------------------------------------------
// Per-person compensation override editor.
// ---------------------------------------------------------------------------
// Edits ONE individual's package. Each field can either inherit the role default
// or be customized. The result is a partial override object holding only the
// customized fields (or null when the person is fully on the default package),
// which the Compensation screen stores under config.overrides[userId].
// ---------------------------------------------------------------------------

export default function PersonCompModal({
  open,
  user,
  roleDefault,
  override,
  onSave,
  onClose,
}) {
  // Local edit state: which fields are customized + their values.
  const [custom, setCustom] = useState({}); // { field: bool }
  const [values, setValues] = useState({}); // { field: number }

  useEffect(() => {
    if (!open || !user) return;
    const fields = fieldsForRole(user.role);
    const nextCustom = {};
    const nextValues = {};
    for (const f of fields) {
      const isOverridden = override && override[f] !== undefined;
      nextCustom[f] = !!isOverridden;
      nextValues[f] = isOverridden ? override[f] : roleDefault[f];
    }
    setCustom(nextCustom);
    setValues(nextValues);
  }, [open, user, override, roleDefault]);

  if (!open || !user) return null;

  const fields = fieldsForRole(user.role);

  function toggle(field, on) {
    setCustom((c) => ({ ...c, [field]: on }));
    // When turning customization off, snap the shown value back to the default.
    if (!on) setValues((v) => ({ ...v, [field]: roleDefault[field] }));
  }

  function save() {
    const next = {};
    for (const f of fields) {
      if (custom[f]) next[f] = Number(values[f]) || 0;
    }
    onSave(Object.keys(next).length ? next : null);
  }

  const customizedCount = fields.filter((f) => custom[f]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Customize compensation — {user.name}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {user.role.toUpperCase()} · toggle a field to set a value just for
              this person; untoggled fields follow the company default.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 px-6 py-5">
          {fields.map((f) => {
            const meta = FIELD_META[f] || { label: f, suffix: "" };
            const on = !!custom[f];
            return (
              <div
                key={f}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
              >
                <label className="flex flex-1 items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => toggle(f, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-slate-700">{meta.label}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    disabled={!on}
                    value={values[f] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [f]: e.target.value === "" ? 0 : Number(e.target.value),
                      }))
                    }
                    className={`w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-right text-sm tabular-nums text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-100 disabled:text-slate-400`}
                  />
                  <span className="w-24 shrink-0 text-xs text-slate-400">
                    {meta.suffix}
                  </span>
                </div>
                {!on ? (
                  <span className="hidden w-28 shrink-0 text-right text-xs text-slate-400 sm:inline">
                    default {roleDefault[f]}
                  </span>
                ) : (
                  <span className="hidden w-28 shrink-0 text-right text-xs font-medium text-brand-700 sm:inline">
                    custom
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            {customizedCount === 0
              ? "No custom fields — this person is fully on the company default."
              : `${customizedCount} field${customizedCount > 1 ? "s" : ""} customized for ${user.name}.`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Apply to {user.name.split(" ")[0]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
