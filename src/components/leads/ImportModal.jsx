"use client";

import { useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { IMPORT_SHEET_HEADERS } from "./columns";
import {
  validateHeaders,
  buildLeadFromRow,
  classifyRows,
} from "@/lib/leadImport";

const tag = {
  new: "bg-green-100 text-green-700",
  duplicate: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

// Excel import flow (BDM only): upload → validate headers → preview + dedupe →
// commit → summary. Parsing/validation logic lives in src/lib/leadImport.js.
export default function ImportModal({
  open,
  onClose,
  existingLeads,
  onImported,
}) {
  const [stage, setStage] = useState("select"); // select | preview | done
  const [fileName, setFileName] = useState("");
  const [headerError, setHeaderError] = useState(null);
  const [parseError, setParseError] = useState("");
  const [classified, setClassified] = useState([]);
  const [summary, setSummary] = useState(null);

  function reset() {
    setStage("select");
    setFileName("");
    setHeaderError(null);
    setParseError("");
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
    try {
      let rows = await readXlsxFile(file);
      // Normalise: some builds return the first sheet's rows directly (an array
      // of arrays); others wrap sheets as [{ sheet, data }]. Handle both.
      if (
        rows.length &&
        !Array.isArray(rows[0]) &&
        Array.isArray(rows[0]?.data)
      ) {
        rows = rows[0].data;
      }
      if (!rows.length) {
        setParseError("The sheet is empty.");
        return;
      }
      const headers = rows[0].map((h) => (h === null ? "" : String(h).trim()));
      const check = validateHeaders(headers);
      if (!check.ok) {
        setHeaderError(check);
        return;
      }
      const leads = rows.slice(1).map((r) => buildLeadFromRow(headers, r));
      setClassified(classifyRows(leads, existingLeads));
      setStage("preview");
    } catch (err) {
      console.error("import parse error:", err);
      setParseError(
        "Could not read the file. Make sure it is a valid .xlsx sheet."
      );
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
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
          {/* STAGE: select */}
          {stage === "select" ? (
            <div>
              <p className="text-sm text-slate-600">
                Upload the scraped <code>.xlsx</code> sheet. It must contain
                exactly these {IMPORT_SHEET_HEADERS.length} columns:
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {IMPORT_SHEET_HEADERS.map((h) => (
                  <span
                    key={h}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 text-center hover:border-brand hover:bg-brand-50/40">
                <span className="text-2xl">📄</span>
                <span className="mt-2 text-sm font-medium text-slate-700">
                  {fileName || "Choose an .xlsx file"}
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  Only the header row + data rows are read.
                </span>
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
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
                    The sheet headers don&apos;t match. Nothing was imported.
                  </p>
                  {headerError.missing.length ? (
                    <p className="mt-1">
                      <span className="font-medium">Missing:</span>{" "}
                      {headerError.missing.join(", ")}
                    </p>
                  ) : null}
                  {headerError.unexpected.length ? (
                    <p className="mt-1">
                      <span className="font-medium">
                        Unexpected / misnamed:
                      </span>{" "}
                      {headerError.unexpected.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* STAGE: preview */}
          {stage === "preview" ? (
            <div>
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

          {/* STAGE: done */}
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          {stage === "preview" ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Choose another file
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={counts.new === 0}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Import {counts.new} lead{counts.new === 1 ? "" : "s"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {stage === "done" ? "Done" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
