"use client";

import { useEffect, useState } from "react";
import { blankUser } from "@/lib/usersConfig";
import { EMPLOYMENT_STATUSES } from "@/data/mockLeads";
import { formatDate, employmentDuration } from "@/lib/format";

// ---------------------------------------------------------------------------
// User detail modal — one component, three modes:
//   "add"  — empty editable form; creates an Invited user (invite email sent).
//   "view" — read-only details for everyone to see; an Edit button switches to…
//   "edit" — the same fields become editable inputs; Save persists.
// Clicking a row's view (eye) action opens "view"; the Admin edits from there.
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}
function empLabel(v) {
  return EMPLOYMENT_STATUSES.find((s) => s.value === v)?.label || "—";
}

// A labelled field: renders an input in edit mode, or plain text in view mode.
function Field({ label, value, editing, children, hint, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>{label}</label>
      {editing ? (
        children
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
          {value === "" || value === null || value === undefined ? "—" : value}
        </p>
      )}
      {editing && hint ? (
        <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 border-b border-slate-100 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function UserModal({
  open,
  initialMode = "view",
  user,
  existing,
  onSave,
  onClose,
}) {
  const [mode, setMode] = useState(initialMode); // add | view | edit
  const [draft, setDraft] = useState(blankUser());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setDraft(
      initialMode === "add" || !user ? blankUser() : { ...blankUser(), ...user }
    );
    setError("");
  }, [open, initialMode, user]);

  if (!open) return null;

  const editing = mode === "add" || mode === "edit";
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  function submit() {
    const name = draft.name.trim();
    if (!name) return setError("Name is required.");
    if (!isValidEmail(draft.companyEmail))
      return setError("A valid company email is required (it's the login).");
    const dupe = (existing || []).some(
      (u) =>
        u.id !== draft.id &&
        (u.companyEmail || "").trim().toLowerCase() ===
          draft.companyEmail.trim().toLowerCase()
    );
    if (dupe)
      return setError("That company email is already used by another user.");

    onSave({
      ...draft,
      name,
      companyEmail: draft.companyEmail.trim(),
      personalEmail: (draft.personalEmail || "").trim(),
      companyPhone: (draft.companyPhone || "").trim(),
      personalPhone: (draft.personalPhone || "").trim(),
      salaryMonthly:
        draft.salaryMonthly === "" || draft.salaryMonthly === null
          ? null
          : Number(draft.salaryMonthly),
    });
  }

  const title =
    mode === "add"
      ? "Add team member"
      : mode === "edit"
        ? `Edit — ${draft.name}`
        : draft.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {mode === "view" ? (
              <p className="mt-0.5 text-xs text-slate-400">
                {draft.role?.toUpperCase()} · {empLabel(draft.employmentStatus)}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {mode === "view" ? (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <Group title="Identity">
            <Field label="Full name" value={draft.name} editing={editing}>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Anaya Rao"
              />
            </Field>
            <Field
              label="Role"
              value={draft.role?.toUpperCase()}
              editing={editing}
            >
              <select
                className={inputClass}
                value={draft.role}
                onChange={(e) => set("role", e.target.value)}
              >
                <option value="dsc">DSC — Digital Sales Consultant</option>
                <option value="bdm">BDM — Business Dev. Manager</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </Group>

          <Group title="Contact">
            <Field
              label="Company email (login)"
              value={draft.companyEmail}
              editing={editing}
            >
              <input
                type="email"
                className={inputClass}
                value={draft.companyEmail}
                onChange={(e) => set("companyEmail", e.target.value)}
                placeholder="name@scriptguru.in"
              />
            </Field>
            <Field
              label="Personal email"
              value={draft.personalEmail}
              editing={editing}
              hint="Multiple allowed — separate with commas"
            >
              <input
                className={inputClass}
                value={draft.personalEmail}
                onChange={(e) => set("personalEmail", e.target.value)}
                placeholder="name@gmail.com, alt@outlook.com"
              />
            </Field>
            <Field
              label="Company phone"
              value={draft.companyPhone}
              editing={editing}
            >
              <input
                className={inputClass}
                value={draft.companyPhone}
                onChange={(e) => set("companyPhone", e.target.value)}
                placeholder="+91 98xxx xxxxx"
              />
            </Field>
            <Field
              label="Personal phone"
              value={draft.personalPhone}
              editing={editing}
              hint="Multiple allowed — separate with commas"
            >
              <input
                className={inputClass}
                value={draft.personalPhone}
                onChange={(e) => set("personalPhone", e.target.value)}
                placeholder="+91 90000 00000, +91 80000 00000"
              />
            </Field>
            <Field label="Address" value={draft.address} editing={editing} full>
              <input
                className={inputClass}
                value={draft.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, area"
              />
            </Field>
            <Field label="City" value={draft.city} editing={editing}>
              <input
                className={inputClass}
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Dehradun"
              />
            </Field>
          </Group>

          <Group title="Employment">
            <Field
              label="Employment status"
              value={empLabel(draft.employmentStatus)}
              editing={editing}
            >
              <select
                className={inputClass}
                value={draft.employmentStatus}
                onChange={(e) => set("employmentStatus", e.target.value)}
              >
                {EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Joining date"
              value={formatDate(draft.joiningDate)}
              editing={editing}
            >
              <input
                type="date"
                className={inputClass}
                value={draft.joiningDate || ""}
                onChange={(e) => set("joiningDate", e.target.value)}
              />
            </Field>
            {/* Duration is derived from the joining date — always read-only. */}
            <Field
              label="Employment duration"
              value={employmentDuration(draft.joiningDate)}
              editing={false}
            />
            <Field
              label="Monthly salary (₹)"
              value={
                draft.salaryMonthly == null
                  ? "—"
                  : `₹${Number(draft.salaryMonthly).toLocaleString("en-IN")}`
              }
              editing={editing}
            >
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
            </Field>
          </Group>
        </div>

        {error ? <p className="px-6 text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            {mode === "add"
              ? "Added as Invited — an invite email lets them set a password and log in."
              : mode === "edit"
                ? "Editable fields are enabled. Duration is calculated from the joining date."
                : "Read-only. Press Edit to change these details."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {mode === "view" ? "Close" : "Cancel"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={submit}
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                {mode === "add" ? "Add & send invite" : "Save changes"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
