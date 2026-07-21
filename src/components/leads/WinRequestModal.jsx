"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompConfig } from "@/lib/compConfig";
import { formatINR } from "@/lib/format";

// The DSC's "close this deal" request. Collects the line items sold (each an
// offering from the catalog + its amount), a quoted amount, and an optional note.
// Closed Amount and Discount % are DERIVED (never free-typed) so the numbers
// can't be gamed. Submitting sends a pending approval request to the Admin; the
// status only becomes "Project Started" once the Admin approves.
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

function money(n) {
  return formatINR(Math.round(n || 0));
}

export default function WinRequestModal({
  open,
  lead,
  requestedBy,
  today,
  onSubmit,
  onClose,
}) {
  const { config } = useCompConfig();
  const offerings = useMemo(
    () =>
      [...(config.services || []), ...(config.products || [])].filter(
        (o) => o.active
      ),
    [config]
  );

  const [lines, setLines] = useState([]);
  const [quoted, setQuoted] = useState("");
  const [note, setNote] = useState("");

  // Seed from the deal's existing line items (or one blank line) each time it opens.
  useEffect(() => {
    if (!open || !lead) return;
    const seed =
      lead.lineItems && lead.lineItems.length
        ? lead.lineItems.map((li) => ({ ...li }))
        : [{ offeringId: offerings[0]?.id || "", amount: 0 }];
    setLines(seed);
    setQuoted(lead.quotedAmount ?? "");
    setNote("");
    // offerings intentionally excluded — we only seed on open, not on catalog changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !lead) return null;

  const closed = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const q = Number(quoted) || 0;
  const discountPct = q > 0 ? ((q - closed) / q) * 100 : null;
  const valid =
    q > 0 &&
    closed > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.offeringId) &&
    lines.some((l) => Number(l.amount) > 0);

  const setLine = (i, patch) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { offeringId: offerings[0]?.id || "", amount: 0 },
    ]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  function submit() {
    if (!valid) return;
    onSubmit({
      requestedBy,
      requestedDate: today,
      quotedAmount: q,
      closedAmount: closed,
      lineItems: lines.map((l) => ({
        offeringId: l.offeringId,
        amount: Number(l.amount) || 0,
      })),
      note: note.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Request to close the deal"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Close deal — request approval
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {lead.company} · {lead.leadId}. Sends a request to the Admin; the
            deal becomes <span className="font-medium">Project Started</span>{" "}
            only once approved.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Line items */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">
                What was sold (line items)
              </label>
              <button
                type="button"
                onClick={addLine}
                className="rounded-md border border-brand px-2 py-1 text-xs font-medium text-brand hover:bg-brand-50"
              >
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={`${inputClass} flex-1`}
                    value={l.offeringId}
                    onChange={(e) => setLine(i, { offeringId: e.target.value })}
                    aria-label="Offering"
                  >
                    <option value="">Select…</option>
                    {offerings.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.kind})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className={`${inputClass} w-32`}
                    value={l.amount}
                    min={0}
                    placeholder="Amount ₹"
                    onChange={(e) =>
                      setLine(i, {
                        amount:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    aria-label="Amount"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Remove line item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quoted + derived closed/discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Quoted amount (₹) *
              </label>
              <input
                type="number"
                className={inputClass}
                value={quoted}
                min={0}
                aria-label="Quoted amount"
                onChange={(e) => setQuoted(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Closed amount (₹)
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-700">
                {money(closed)}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Auto = sum of line items
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Discount:{" "}
            <span className="font-semibold text-slate-800">
              {discountPct === null
                ? "—"
                : `${Math.round(discountPct * 10) / 10}%`}
            </span>{" "}
            {discountPct !== null && discountPct < 0 ? (
              <span className="text-amber-600">(sold above quote)</span>
            ) : null}{" "}
            · auto-calculated from quoted − closed.
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Note to Admin (optional)
            </label>
            <textarea
              rows={2}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context for the approval…"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send for approval
          </button>
        </div>
      </div>
    </div>
  );
}
