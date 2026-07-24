"use client";

import { useEffect, useMemo, useState } from "react";

// Create ONE deal (one offering) under a lead — the confirmation step of the
// Lead → Deal flow. The offering dropdown is the lead's **Services Interested**
// (the DSC's knowledge tags), so a deal can only be for something the lead
// actually wants. The DSC fills the pitched (quoted) amount to save; the
// finalized (closed) amount is optional here and becomes compulsory only when the
// deal is sent for approval. Discount is derived.
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export default function CreateDealModal({
  open,
  lead,
  offerings, // [{ id, name, kind }] — the lead's interested offerings only
  onSubmit,
  onClose,
}) {
  const [offeringId, setOfferingId] = useState("");
  const [quoted, setQuoted] = useState("");
  const [closed, setClosed] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setOfferingId(offerings?.[0]?.id || "");
    setQuoted("");
    setClosed("");
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const quotedNum = Number(quoted) || 0;
  const closedNum = closed === "" ? null : Number(closed) || 0;
  const discountPct = useMemo(() => {
    if (!quotedNum || closedNum == null) return null;
    return Math.round(((quotedNum - closedNum) / quotedNum) * 1000) / 10;
  }, [quotedNum, closedNum]);

  if (!open || !lead) return null;

  const valid = offeringId && quotedNum > 0;

  function submit() {
    if (!valid) return;
    onSubmit({
      offeringId,
      quotedAmount: quotedNum || null,
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
        aria-label="Create a deal"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Create a deal
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {lead.company} · one deal = one offering. Pick from what the lead is
            interested in; it opens in the deal pipeline.
          </p>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Offering *
            </label>
            {offerings.length ? (
              <select
                className={inputClass}
                value={offeringId}
                onChange={(e) => setOfferingId(e.target.value)}
                aria-label="Offering"
              >
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.kind})
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
                Mark a service in <b>Services Interested</b> on the lead first —
                a deal can only be for something the lead wants.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Pitched (₹) *
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={quoted}
                onChange={(e) => setQuoted(e.target.value)}
                aria-label="Pitched amount"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Finalized (₹)
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={closed}
                onChange={(e) => setClosed(e.target.value)}
                aria-label="Finalized amount"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Save with just the pitched amount for now. The finalized amount
            becomes required when you send the deal for approval — discount is{" "}
            {discountPct == null ? (
              "then auto-calculated."
            ) : (
              <span className="font-medium text-slate-600">
                {discountPct}% now.
              </span>
            )}
          </p>

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
