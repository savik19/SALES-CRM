"use client";

import { useState } from "react";
import ExcelJS from "exceljs";
import {
  validateHeaders,
  buildLeadFromRow,
  classifyRows,
  isBlankRow,
} from "@/lib/leadImport";

const tag = {
  new: "bg-green-100 text-green-700",
  duplicate: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

// Convert an ExcelJS cell value to a plain value (string | number | Date).
function cellValue(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if (Array.isArray(v.richText))
      return v.richText.map((t) => t.text).join("");
    if (v.text !== undefined) return v.text; // hyperlink
    if (v.result !== undefined) return v.result; // formula
    return "";
  }
  return v;
}

// Excel import flow (BDM only): upload → validate headers → preview + dedupe →
// commit → summary. `importCols` are the expected columns (from the editable
// config); parsing uses ExcelJS; logic lives in lib/leadImport.js.
export default function ImportModal({
  open,
  onClose,
  existingLeads,
  onImported,
  importCols,
}) {
  const [stage, setStage] = useState("select"); // select | preview | done
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [headerError, setHeaderError] = useState(null);
  const [parseError, setParseError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [classified, setClassified] = useState([]);
  const [summary, setSummary] = useState(null);

  function reset() {
    setStage("select");
    setFileName("");
    setLoading(false);
    setHeaderError(null);
    setParseError("");
    setWarnings([]);
    setClassified([]);
    setSummary(null);
  }
  function close() {
    reset();
    onClose();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setHeaderError(null);
    setWarnings([]);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) {
        setParseError("The workbook has no sheets.");
        return;
      }

      // Determine the USED column width from the header row. (Real sheets can
      // report a huge columnCount from stray formatting, which would freeze a
      // naive 1..columnCount scan — so we bound to the real header width.)
      const headerVals = ws.getRow(1).values || [];
      let usedCols = 0;
      for (let i = 1; i < headerVals.length; i++) {
        if (String(cellValue(headerVals[i]) ?? "").trim() !== "") usedCols = i;
      }
      usedCols = Math.min(usedCols, 200);
      if (!usedCols) {
        setParseError("Couldn't find a header row in the sheet.");
        return;
      }

      const rows = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const cells = [];
        for (let i = 1; i <= usedCols; i++) {
          cells.push(cellValue(row.getCell(i).value));
        }
        rows.push(cells);
      });
      if (!rows.length) {
        setParseError("The sheet has no rows.");
        return;
      }

      const headers = rows[0].map((h) => (h === null ? "" : String(h).trim()));
      const check = validateHeaders(headers, importCols);
      if (!check.ok) {
        setHeaderError(check);
        return;
      }
      if (check.unexpected.length) {
        setWarnings([
          `Ignoring ${check.unexpected.length} extra column(s): ${check.unexpected.join(", ")}`,
        ]);
      }
      const dataRows = rows.slice(1).filter((r) => !isBlankRow(r));
      const leads = dataRows.map((r) =>
        buildLeadFromRow(importCols, check.indexByKey, r)
      );
      setClassified(classifyRows(leads, existingLeads));
      setStage("preview");
    } catch (err) {
      console.error("import parse error:", err);
      setParseError(
        "Could not read the file. Make sure it is a valid .xlsx sheet."
      );
    } finally {
      setLoading(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  function commit() {
    const newLeads = classified
      .filter((c) => c.status === "new")
      .map((c) => c.lead);
    const dup = classified.filter((c) => c.status === "duplicate").length;
    const failed = classified.filter((c) => c.status === "error");
    onImported(newLeads);
    setSummary({ imported: newLeads.length, duplicates: dup, failed });
    setStage("done");
  }

  if (!open) return null;

  const counts = {
    new: classified.filter((c) => c.status === "new").length,
    duplicate: classified.filter((c) => c.status === "duplicate").length,
    error: classified.filter((c) => c.status === "error").length,
  };
  const canImport = stage === "preview" && counts.new > 0;
  const expectedHeaders = importCols.map((c) => c.label);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Import leads from Excel
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stage === "select" ? (
            <div>
              <p className="text-sm text-slate-600">
                Upload the scraped <code>.xlsx</code> sheet. It must contain
                these {expectedHeaders.length} columns (extra columns are
                ignored; common header variants are matched automatically — edit
                the mapping under{" "}
                <span className="font-medium">Column Mapping</span>):
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {expectedHeaders.map((h) => (
                  <span
                    key={h}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <label
                className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center ${
                  loading
                    ? "border-brand bg-brand-50/40"
                    : "border-slate-300 hover:border-brand hover:bg-brand-50/40"
                }`}
              >
                <span className="text-2xl">{loading ? "⏳" : "📄"}</span>
                <span className="mt-2 text-sm font-medium text-slate-700">
                  {loading
                    ? `Reading ${fileName}…`
                    : fileName || "Choose an .xlsx file"}
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  Only the header row + data rows are read.
                </span>
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  disabled={loading}
                  onChange={onFile}
                />
              </label>

              {parseError ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {parseError}
                </p>
              ) : null}

              {headerError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p className="font-medium">
                    The sheet is missing required columns. Nothing was imported.
                  </p>
                  {headerError.missing.length ? (
                    <p className="mt-1">
                      <span className="font-medium">Missing:</span>{" "}
                      {headerError.missing.join(", ")}
                    </p>
                  ) : null}
                  {headerError.unexpected.length ? (
                    <p className="mt-1">
                      <span className="font-medium">Unrecognised columns:</span>{" "}
                      {headerError.unexpected.join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs">
                    Tip: add these header names as aliases under Column Mapping.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {stage === "preview" ? (
            <div>
              {warnings.length ? (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {warnings.join(" ")}
                </p>
              ) : null}
              <div className="mb-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-700">
                  {counts.new} new
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-700">
                  {counts.duplicate} duplicates
                </span>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700">
                  {counts.error} errors
                </span>
                <span className="ml-auto text-slate-500">
                  {classified.length} rows parsed
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-600">
                        Status
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-600">
                        Lead Id
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-600">
                        Company
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-600">
                        City
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-600">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classified.map((c, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${tag[c.status]}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">
                          {c.lead.leadId || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {c.lead.company || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {c.lead.city || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{c.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Every imported lead is added as{" "}
                <span className="font-medium">Lead Status = New</span> and{" "}
                <span className="font-medium">Assigned DSC = blank</span>.
                Duplicates and errors are skipped.
              </p>
            </div>
          ) : null}

          {stage === "done" && summary ? (
            <div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  ✅ <span className="font-semibold">{summary.imported}</span>{" "}
                  imported ·{" "}
                  <span className="font-semibold">{summary.duplicates}</span>{" "}
                  skipped as duplicates ·{" "}
                  <span className="font-semibold">{summary.failed.length}</span>{" "}
                  failed
                </p>
              </div>
              {summary.failed.length ? (
                <div className="mt-3">
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    Failed rows
                  </p>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {summary.failed.map((c, i) => (
                      <li key={i}>
                        <span className="font-mono text-xs text-slate-500">
                          {c.lead.leadId || c.lead.company || `row ${i + 1}`}
                        </span>{" "}
                        — {c.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer — Import is always visible, enabled only after a clean parse */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          {stage === "done" ? (
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Done
            </button>
          ) : (
            <>
              {stage === "preview" ? (
                <button
                  type="button"
                  onClick={reset}
                  className="mr-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Choose another file
                </button>
              ) : null}
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={!canImport}
                title={canImport ? undefined : "Upload a valid sheet first"}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {canImport
                  ? `Import ${counts.new} lead${counts.new === 1 ? "" : "s"}`
                  : "Import"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
