"use client";

import { useEffect, useState } from "react";
import { blankUser } from "@/lib/usersConfig";

// Add / edit a team member. In "add" mode the admin fills the details and the
// user is created as "invited" (an invite email goes out). In "edit" mode the
// same form updates an existing person's HR details.
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function UserFormModal({
  open,
  mode,
  user,
  existing,
  onSave,
  onClose,
}) {
  const [draft, setDraft] = useState(blankUser());
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(
        mode === "edit" && user ? { ...blankUser(), ...user } : blankUser()
      );
      setError("");
    }
  }, [open, mode, user]);

  if (!open) return null;

  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function submit() {
    const name = draft.name.trim();
    if (!name) return setError("Name is required.");
    if (!isValidEmail(draft.email))
      return setError("A valid email is required.");
    // Email must be unique (it's the login handle) — ignore the row being edited.
    const dupe = (existing || []).some(
      (u) =>
        u.id !== draft.id &&
        u.email.trim().toLowerCase() === draft.email.trim().toLowerCase()
    );
    if (dupe) return setError("That email is already used by another user.");

    onSave({
      ...draft,
      name,
      email: draft.email.trim(),
      salaryMonthly:
        draft.salaryMonthly === "" || draft.salaryMonthly === null
          ? null
          : Number(draft.salaryMonthly),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {mode === "edit" ? "Edit team member" : "Add team member"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Full name *</label>
            <input
              className={inputClass}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Anaya Rao"
            />
          </div>
          <div>
            <label className={labelClass}>Role *</label>
            <select
              className={inputClass}
              value={draft.role}
              onChange={(e) => set("role", e.target.value)}
            >
              <option value="dsc">DSC — Digital Sales Consultant</option>
              <option value="bdm">BDM — Business Dev. Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Email * (login handle)</label>
            <input
              type="email"
              className={inputClass}
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@scriptguru.in"
            />
          </div>
          <div>
            <label className={labelClass}>Mobile number</label>
            <input
              className={inputClass}
              value={draft.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              placeholder="+91 98xxx xxxxx"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <input
              className={inputClass}
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street, area"
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Dehradun"
            />
          </div>
          <div>
            <label className={labelClass}>Monthly salary (₹)</label>
            <input
              type="number"
              className={inputClass}
              value={draft.salaryMonthly ?? ""}
              onChange={(e) =>
                set(
                  "salaryMonthly",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              placeholder="25000"
            />
          </div>
          <div>
            <label className={labelClass}>Months since joining</label>
            <input
              type="number"
              className={inputClass}
              value={draft.joinedMonthsAgo ?? 0}
              onChange={(e) =>
                set(
                  "joinedMonthsAgo",
                  e.target.value === "" ? 0 : Number(e.target.value)
                )
              }
              placeholder="0"
            />
            <p className="mt-0.5 text-xs text-slate-400">
              Under the training window (Compensation) counts as in-training
              pay.
            </p>
          </div>
        </div>

        {error ? <p className="px-6 text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            {mode === "edit"
              ? "Saves the updated details."
              : "The new user is added as Invited — an invite email lets them set a password and log in."}
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
              onClick={submit}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              {mode === "edit" ? "Save changes" : "Add & send invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
