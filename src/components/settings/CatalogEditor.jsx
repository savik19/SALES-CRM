"use client";

// Admin editor for one catalog list (Services or Products). Fully controlled by
// the Compensation screen's draft: edits call onChange/onAdd/onRemove and are
// committed with the page's Update button. Each offering sets a commission rule
// PER ROLE (DSC and BDM) — a flat ₹ amount or a % of the sold value.

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

// One { type, value } commission rule: a Fixed ₹ amount or a Percentage.
function RuleInput({ rule, onChange }) {
  const percent = rule.type === "percent";
  return (
    <div className="flex items-center gap-1.5">
      <select
        className={`${inputClass} w-24`}
        value={rule.type}
        onChange={(e) => onChange({ ...rule, type: e.target.value })}
        aria-label="Commission type"
      >
        <option value="fixed">₹ Fixed</option>
        <option value="percent">% of sale</option>
      </select>
      <input
        type="number"
        className={`${inputClass} w-24`}
        value={rule.value}
        min={0}
        onChange={(e) =>
          onChange({
            ...rule,
            value: e.target.value === "" ? 0 : Number(e.target.value),
          })
        }
        aria-label="Commission value"
      />
      <span className="w-4 shrink-0 text-xs text-slate-400">
        {percent ? "%" : "₹"}
      </span>
    </div>
  );
}

export default function CatalogEditor({
  title,
  subtitle,
  addLabel,
  items,
  onAdd,
  onChange,
  onRemove,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-50"
        >
          + {addLabel}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">DSC commission</th>
              <th className="px-3 py-2 font-semibold">BDM override</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-xs text-slate-400"
                >
                  None yet — add one with the button above.
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-slate-100 align-middle"
                >
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className={`${inputClass} w-48`}
                      value={o.name}
                      placeholder="Offering name"
                      onChange={(e) => onChange(o.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <RuleInput
                      rule={o.dsc}
                      onChange={(dsc) => onChange(o.id, { dsc })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <RuleInput
                      rule={o.bdm}
                      onChange={(bdm) => onChange(o.id, { bdm })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={o.active}
                      onClick={() => onChange(o.id, { active: !o.active })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        o.active ? "bg-brand" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          o.active ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(o.id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${o.name || "offering"}`}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
