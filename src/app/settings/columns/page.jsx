"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { useColumnConfig } from "@/lib/columnConfig";

// ---------------------------------------------------------------------------
// Column Mapping (admin / BDM) — edit the mapping between the CRM leads-table
// columns and the Excel import-sheet headers, all from the UI.
//
// For each column you can:
//   - rename the CRM column (its stable ID never changes)
//   - toggle whether it comes from the import sheet
//   - edit the sheet header names (aliases) that map to it
//   - remove it; or add a brand-new custom column
// Nothing changes until you click "Update" (edits are held in a local draft).
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export default function ColumnMappingPage() {
  const { columns, replaceAll, resetToDefault } = useColumnConfig();
  const [draft, setDraft] = useState(columns);
  const [newLabel, setNewLabel] = useState("");
  const [saved, setSaved] = useState(false);

  // Keep the draft in sync if the underlying config changes (e.g. after Reset).
  useEffect(() => {
    setDraft(columns);
  }, [columns]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(columns);

  function edit(key, patch) {
    setSaved(false);
    setDraft((d) => d.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }
  function remove(key) {
    setSaved(false);
    setDraft((d) => d.filter((c) => c.key !== key));
  }
  function addColumn() {
    const label = newLabel.trim();
    if (!label) return;
    let key = "custom_" + label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    let n = 1;
    while (draft.some((c) => c.key === key)) key = `${key}_${++n}`;
    setDraft((d) => [
      ...d,
      {
        key,
        label,
        group: "Custom",
        defaultVisible: true,
        sortType: "text",
        searchable: false,
        inImportSheet: false,
        aliases: [],
        width: 160,
        custom: true,
      },
    ]);
    setNewLabel("");
    setSaved(false);
  }
  function save() {
    replaceAll(draft);
    setSaved(true);
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Column Mapping"
        subtitle="Map CRM columns to your Excel sheet headers. Rename columns, edit aliases, add or remove columns."
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetToDefault();
                setSaved(false);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Update
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-6 py-5">
        {saved ? (
          <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✅ Mapping updated. The Lead Table and Excel import now use these
            names.
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">
                  CRM Column (leads table)
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">
                  Column ID
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">
                  From import sheet?
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">
                  Sheet header names (comma-separated aliases)
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {draft.map((col) => (
                <tr key={col.key} className="border-t border-slate-100">
                  <td className="px-4 py-2 align-top">
                    <input
                      className={inputClass}
                      value={col.label}
                      onChange={(e) => edit(col.key, { label: e.target.value })}
                    />
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {col.group}
                      {col.computed ? " · computed" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <code className="text-xs text-slate-500">{col.key}</code>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={col.inImportSheet}
                        onChange={(e) =>
                          edit(col.key, { inImportSheet: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <span className="text-xs text-slate-500">
                        {col.inImportSheet ? "Yes" : "No"}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-2 align-top">
                    {col.inImportSheet ? (
                      <input
                        className={inputClass}
                        placeholder="e.g. Phone Number, Mobile"
                        value={(col.aliases || []).join(", ")}
                        onChange={(e) =>
                          edit(col.key, {
                            aliases: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        Not imported (CRM-only field)
                      </span>
                    )}
                    {col.inImportSheet ? (
                      <span className="mt-0.5 block text-xs text-slate-400">
                        Matches: <b>{col.label}</b>
                        {(col.aliases || []).length
                          ? `, ${col.aliases.join(", ")}`
                          : ""}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => remove(col.key)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Remove column"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add a column */}
        <div className="mt-4 flex items-center gap-2">
          <input
            className={`${inputClass} max-w-xs`}
            placeholder="New column name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addColumn()}
          />
          <button
            type="button"
            onClick={addColumn}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Add column
          </button>
          {dirty ? (
            <span className="ml-auto text-xs text-amber-600">
              Unsaved changes — click Update to apply.
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Changes are saved in your browser for now. TODO(backend): persist via
          an API (GET/PUT <code>/api/columns</code>) so the whole team shares
          one mapping.
        </p>
      </div>
    </div>
  );
}
