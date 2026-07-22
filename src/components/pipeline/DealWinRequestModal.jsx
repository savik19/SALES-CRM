"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

// The DSC's "win this deal" request (Lead → Deal model). A deal is ONE offering,
// so there are no line items to pick — just confirm the closed (final) amount and
// add an optional note. Submitting sends a pending approval to the Admin; the
// deal only becomes "Won" (credited for target + commission) once approved.
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export default function DealWinRequestModal({
  open,
  deal, // the deal being advanced (with offeringName + company enriched)
  toStatus = "Project Started", // the gated stage requested
  requestedBy,
  today,
  onSubmit,
  onClose,
}) {
  const [closed, setClosed] = useState("");
  const [note, setNote] = useState("");

  // Seed the closed amount from the deal's quoted value each time it opens.
  useEffect(() => {
    if (!open || !deal) return;
    setClosed(deal.quotedAmount ?? "");
    setNote("");
  }, [open, deal]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !deal) return null;

  const quoted = Number(deal.quotedAmount) || 0;
  const closedNum = Number(closed) || 0;
  const discountPct = quoted > 0 ? ((quoted - closedNum) / quoted) * 100 : null;
  const valid = closedNum > 0;

  function submit() {
    if (!valid) return;
    onSubmit({
      requestedBy,
      requestedDate: today,
      quotedAmount: quoted,
      closedAmount: closedNum,
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
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Request approval to start the project"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Start project — request approval
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {deal.company} · {deal.offeringName}. Fill the finalized amount and
            send to the Admin; the deal moves to{" "}
            <span className="font-medium">{toStatus}</span> and is credited only
            once approved.
          </p>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Quoted (₹)
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-700">
                {formatINR(quoted)}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Closed amount (₹) *
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={closed}
                onChange={(e) => setClosed(e.target.value)}
                aria-label="Closed amount"
              />
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
