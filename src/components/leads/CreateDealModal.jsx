"use client";

import { useEffect, useState } from "react";

// Create ONE deal (one offering) under a lead — the confirmation step of the
// Lead → Deal flow. The DSC picks the offering the lead confirmed and an
// estimated value; the deal starts at "Open" and moves through the deal pipeline.
// Closed value + commission are settled later when the deal is won.
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export default function CreateDealModal({
  open,
  lead,
  offerings, // [{ id, name, kind }] active catalog offerings
  interestIds = [], // the lead's interested offering ids (defaults the picker)
  onSubmit,
  onClose,
}) {
  const [offeringId, setOfferingId] = useState("");
  const [quoted, setQuoted] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setOfferingId(interestIds[0] || offerings?.[0]?.id || "");
    setQuoted("");
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !lead) return null;

  const valid = offeringId && Number(quoted) > 0;

  // Show interested offerings first, then the rest.
  const ordered = [
    ...offerings.filter((o) => interestIds.includes(o.id)),
    ...offerings.filter((o) => !interestIds.includes(o.id)),
  ];

  function submit() {
    if (!valid) return;
    onSubmit({
      offeringId,
      quotedAmount: Number(quoted) || null,
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
        aria-label="Create a deal"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Create a deal
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {lead.company} · one deal = one offering. It opens in the deal
            pipeline.
          </p>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Offering *
            </label>
            <select
              className={inputClass}
              value={offeringId}
              onChange={(e) => setOfferingId(e.target.value)}
              aria-label="Offering"
            >
              <option value="">Select…</option>
              {ordered.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.kind})
                  {interestIds.includes(o.id) ? " · interested" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Estimated value (₹) *
            </label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={quoted}
              onChange={(e) => setQuoted(e.target.value)}
              aria-label="Estimated value"
            />
            <p className="mt-0.5 text-[11px] text-slate-400">
              The closed value + commission are settled when the deal is won.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Note (optional)
            </label>
            <textarea
              rows={2}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
            Create deal
          </button>
        </div>
      </div>
    </div>
  );
}
