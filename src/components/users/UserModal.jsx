"use client";

import { useEffect, useRef, useState } from "react";
import { blankUser } from "@/lib/usersConfig";
import { EMPLOYMENT_STATUSES } from "@/data/mockLeads";
import { formatDate, employmentDuration } from "@/lib/format";

// ---------------------------------------------------------------------------
// User detail modal — one component, three modes:
//   "add"  — empty editable form; ADDS the user (no invite yet — that's a
//            separate action from the table). All fields are mandatory (marked
//            with a red *); empty/invalid fields are outlined red on submit.
//   "view" — read-only details for everyone to see; an Edit button switches to…
//   "edit" — the same fields become editable inputs; Save persists.
// The country (dial) code prefixes new phone numbers; the company email is
// auto-derived from the name on add.
// ---------------------------------------------------------------------------

const baseInput =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1";
const okInput = "border-slate-300 focus:border-brand focus:ring-brand";
const badInput = "border-red-400 ring-1 ring-red-200 focus:border-red-500";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}
function empLabel(v) {
  return EMPLOYMENT_STATUSES.find((s) => s.value === v)?.label || "—";
}
function emailSlug(name) {
  const first = (name || "").trim().split(/\s+/)[0] || "";
  return first.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function digitCount(v) {
  return ((v || "").match(/\d/g) || []).length;
}
function splitMulti(v) {
  return (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// A labelled field: input in edit mode, plain text in view mode.
function Field({ label, value, editing, required, children, hint, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>
        {label}
        {editing && required ? (
          <span className="ml-0.5 text-red-500">*</span>
        ) : null}
      </label>
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
  const [invalid, setInvalid] = useState(() => new Set());
  const emailTouched = useRef(false);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError("");
    setInvalid(new Set());
    emailTouched.current = false;
    if (initialMode === "add" || !user) {
      const base = blankUser();
      base.companyPhone = `${base.dialCode} `;
      base.personalPhone = `${base.dialCode} `;
      setDraft(base);
    } else {
      setDraft({ ...blankUser(), ...user });
    }
  }, [open, initialMode, user]);

  if (!open) return null;

  const editing = mode === "add" || mode === "edit";
  const isAdd = mode === "add";

  function clearInvalid(...keys) {
    setInvalid((prev) => {
      if (!keys.some((k) => prev.has(k))) return prev;
      const n = new Set(prev);
      keys.forEach((k) => n.delete(k));
      return n;
    });
  }
  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    clearInvalid(key);
  };
  const cls = (key) => `${baseInput} ${invalid.has(key) ? badInput : okInput}`;

  function onNameChange(name) {
    setDraft((d) => {
      const next = { ...d, name };
      if (isAdd && !emailTouched.current) {
        const slug = emailSlug(name);
        next.companyEmail = slug ? `${slug}@${d.companyDomain}` : "";
      }
      return next;
    });
    clearInvalid("name", "companyEmail");
  }

  // Returns the set of invalid required fields + a message for the first issue.
  function validate() {
    const bad = new Set();
    const add = (k) => bad.add(k);

    if (!draft.name.trim()) add("name");
    if (!isValidEmail(draft.companyEmail)) add("companyEmail");
    if (
      !draft.personalEmail.trim() ||
      splitMulti(draft.personalEmail).some((e) => !isValidEmail(e))
    )
      add("personalEmail");
    if (digitCount(draft.companyPhone) < 7) add("companyPhone");
    if (digitCount(draft.personalPhone) < 7) add("personalPhone");
    if (!draft.address.trim()) add("address");
    if (!draft.city.trim()) add("city");
    if (!draft.joiningDate) add("joiningDate");
    if (draft.salaryMonthly === null || Number(draft.salaryMonthly) <= 0)
      add("salaryMonthly");

    // Company email must be unique (even if otherwise valid).
    const dupe =
      isValidEmail(draft.companyEmail) &&
      (existing || []).some(
        (u) =>
          u.id !== draft.id &&
          (u.companyEmail || "").trim().toLowerCase() ===
            draft.companyEmail.trim().toLowerCase()
      );
    if (dupe) add("companyEmail");

    let msg = "";
    if (dupe) msg = "That company email is already used by another user.";
    else if (bad.size)
      msg = "Please fill the required fields highlighted in red.";
    return { bad, msg };
  }

  function submit() {
    const { bad, msg } = validate();
    if (bad.size) {
      setInvalid(bad);
      setError(msg);
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
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
            <Field
              label="Full name"
              value={draft.name}
              editing={editing}
              required
            >
              <input
                className={cls("name")}
                value={draft.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. Anaya Rao"
              />
            </Field>
            <Field
              label="Role"
              value={draft.role?.toUpperCase()}
              editing={editing}
            >
              <select
                className={cls("role")}
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
              required
            >
              <input
                type="email"
                className={cls("companyEmail")}
                value={draft.companyEmail}
                onChange={(e) => {
                  emailTouched.current = true;
                  set("companyEmail", e.target.value);
                }}
                placeholder="name@scriptguru.in"
              />
            </Field>
            <Field
              label="Personal email"
              value={draft.personalEmail}
              editing={editing}
              required
              hint="Multiple allowed — separate with commas"
            >
              <input
                className={cls("personalEmail")}
                value={draft.personalEmail}
                onChange={(e) => set("personalEmail", e.target.value)}
                placeholder="name@gmail.com, alt@outlook.com"
              />
            </Field>
            <Field
              label="Country code"
              value={draft.dialCode}
              editing={editing}
              hint="Prefixes new phone numbers"
            >
              <input
                className={cls("dialCode")}
                value={draft.dialCode}
                onChange={(e) => set("dialCode", e.target.value)}
                placeholder="+91"
              />
            </Field>
            <div className="hidden sm:block" />
            <Field
              label="Company phone"
              value={draft.companyPhone}
              editing={editing}
              required
            >
              <input
                className={cls("companyPhone")}
                value={draft.companyPhone}
                onChange={(e) => set("companyPhone", e.target.value)}
                placeholder="+91 98xxx xxxxx"
              />
            </Field>
            <Field
              label="Personal phone"
              value={draft.personalPhone}
              editing={editing}
              required
              hint="Multiple allowed — separate with commas"
            >
              <input
                className={cls("personalPhone")}
                value={draft.personalPhone}
                onChange={(e) => set("personalPhone", e.target.value)}
                placeholder="+91 90000 00000, +91 80000 00000"
              />
            </Field>
            <Field
              label="Address"
              value={draft.address}
              editing={editing}
              required
              full
            >
              <input
                className={cls("address")}
                value={draft.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, area"
              />
            </Field>
            <Field label="City" value={draft.city} editing={editing} required>
              <input
                className={cls("city")}
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
                className={cls("employmentStatus")}
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
              required
            >
              <input
                type="date"
                className={cls("joiningDate")}
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
              required
              hint="Becomes the post-training base salary in Compensation"
            >
              <input
                type="number"
                className={cls("salaryMonthly")}
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

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {mode === "view" ? "Close" : "Cancel"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={submit}
              className="whitespace-nowrap rounded-lg bg-brand px-5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              {mode === "add" ? "Add user" : "Save changes"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
