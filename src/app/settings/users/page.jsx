"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Topbar from "@/components/layout/Topbar";
import UserModal from "@/components/users/UserModal";
import { useUsers, useUserCounts } from "@/lib/usersConfig";
import { EMPLOYMENT_STATUSES } from "@/data/mockLeads";
import { formatDate, employmentDuration } from "@/lib/format";

// ---------------------------------------------------------------------------
// User Management (Admin) — add BDMs & DSCs with full HR details, see counts,
// deactivate leavers, and invite joiners. Adding a user and sending the invite
// are separate steps. Row actions live in a three-dot menu at the start of the
// row. Frontend-only for now; API swap points in usersConfig.
// ---------------------------------------------------------------------------

const ROLE_LABEL = { admin: "Admin", bdm: "BDM", dsc: "DSC" };

// Account access status.
const STATUS_STYLES = {
  added: "bg-slate-100 text-slate-600 ring-slate-400/20",
  invited: "bg-amber-50 text-amber-700 ring-amber-600/20",
  active: "bg-green-50 text-green-700 ring-green-600/20",
  deactivated: "bg-slate-100 text-slate-500 ring-slate-400/20",
};
const STATUS_LABEL = {
  added: "Added",
  invited: "Invited",
  active: "Active",
  deactivated: "Deactivated",
};

// Employment (HR) status.
const EMP_STYLES = {
  probation_training: "bg-sky-50 text-sky-700 ring-sky-600/20",
  full_time: "bg-green-50 text-green-700 ring-green-600/20",
  notice_period: "bg-amber-50 text-amber-700 ring-amber-600/20",
  resigned: "bg-red-50 text-red-700 ring-red-600/20",
};
const EMP_LABEL = Object.fromEntries(
  EMPLOYMENT_STATUSES.map((s) => [s.value, s.label])
);

function Badge({ styles, label }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

function CountCard({ label, value, tone = "slate", sub }) {
  const tones = {
    slate: "text-slate-900",
    brand: "text-brand-700",
    green: "text-green-700",
    amber: "text-amber-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

function fmtSalary(v) {
  if (v === null || v === undefined || v === "") return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

// Render a possibly-multi-value contact field (comma-separated) compactly.
function MultiValue({ value }) {
  const parts = (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <span className="whitespace-nowrap" title={parts.join(", ")}>
      {parts[0]}
      {parts.length > 1 ? (
        <span className="ml-1 text-xs text-slate-400">+{parts.length - 1}</span>
      ) : null}
    </span>
  );
}

// Three-dot row menu. Renders its dropdown in a portal with fixed positioning so
// it never gets clipped by the table's scroll container.
function KebabMenu({ items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggle() {
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Row actions"
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              style={{ position: "fixed", top: pos.top, left: pos.left }}
              className="z-50 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              {items.map((it, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    it.danger ? "text-red-600" : "text-slate-700"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default function UsersPage() {
  const { users, addUser, updateUser, setStatus, sendInvite } = useUsers();
  const counts = useUserCounts();

  const [modal, setModal] = useState({ open: false, mode: "add", user: null });
  const [roleFilter, setRoleFilter] = useState("all"); // all | dsc | bdm | admin
  const [statusFilter, setStatusFilter] = useState("all"); // all | added | invited | active | deactivated
  const [flash, setFlash] = useState("");

  const rows = useMemo(() => {
    return users
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) =>
        statusFilter === "all" ? true : u.status === statusFilter
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, roleFilter, statusFilter]);

  function notify(msg) {
    setFlash(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setFlash(""), 4000);
  }

  function handleSave(draft) {
    if (draft.id) {
      updateUser(draft.id, draft);
      notify(`Saved ${draft.name}'s details.`);
    } else {
      const created = addUser(draft);
      notify(
        `${created.name} added to the directory. Use the row menu to send them an invite when ready.`
      );
    }
    setModal({ open: false, mode: "add", user: null });
  }

  const closeModal = () => setModal({ open: false, mode: "add", user: null });

  // The action menu for a row, built from the user's current status.
  function menuFor(u) {
    const items = [
      {
        label: "View user",
        onClick: () => setModal({ open: true, mode: "view", user: u }),
      },
    ];
    if (u.status === "added") {
      items.push({
        label: "Send invite mail",
        onClick: () => {
          sendInvite(u.id);
          notify(`Invite sent to ${u.companyEmail}.`);
        },
      });
    } else if (u.status === "invited") {
      items.push({
        label: "Resend invite mail",
        onClick: () => {
          sendInvite(u.id);
          notify(`Invite re-sent to ${u.companyEmail}.`);
        },
      });
    }
    if (u.status === "deactivated") {
      items.push({
        label: "Reactivate user",
        onClick: () => {
          setStatus(u.id, "active");
          notify(`${u.name} reactivated.`);
        },
      });
    } else {
      items.push({
        label: "Deactivate user",
        danger: true,
        onClick: () => {
          setStatus(u.id, "deactivated");
          notify(
            `${u.name} deactivated — they can no longer log in or receive leads.`
          );
        },
      });
    }
    return items;
  }

  const HEAD =
    "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="User Management"
        subtitle="Admin — add BDMs and DSCs, manage their details, deactivate leavers, and invite new joiners."
        right={
          <button
            type="button"
            onClick={() => setModal({ open: true, mode: "add", user: null })}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Add user
          </button>
        }
      />

      <div className="flex-1 space-y-5 overflow-auto px-6 py-5">
        {flash ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✅ {flash}
          </p>
        ) : null}

        {/* Headcount */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountCard
            label="Total DSCs"
            value={counts.dscTotal}
            tone="brand"
            sub={`${counts.dscActive} active`}
          />
          <CountCard
            label="Total BDMs"
            value={counts.bdmTotal}
            tone="brand"
            sub={`${counts.bdmActive} active`}
          />
          <CountCard
            label="Invited"
            value={counts.invited}
            tone="amber"
            sub="Not yet logged in"
          />
          <CountCard
            label="Deactivated"
            value={counts.deactivated}
            tone="slate"
            sub="Left the company"
          />
        </div>

        {/* Filters — by role and by account status */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Role
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="all">All roles</option>
              <option value="dsc">DSC</option>
              <option value="bdm">BDM</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="all">All statuses</option>
              <option value="added">Added</option>
              <option value="invited">Invited</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </label>
          <span className="ml-auto text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? "user" : "users"}
          </span>
        </div>

        {/* Team table — headers stay on one line; scroll right for more columns.
            Address is not a column (it's in the detail view). */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={`${HEAD} w-12`} />
                  <th className={HEAD}>Name</th>
                  <th className={HEAD}>Role</th>
                  <th className={HEAD}>Company email</th>
                  <th className={HEAD}>Personal email</th>
                  <th className={HEAD}>Company phone</th>
                  <th className={HEAD}>Personal phone</th>
                  <th className={HEAD}>City</th>
                  <th className={HEAD}>Monthly salary</th>
                  <th className={HEAD}>Employment status</th>
                  <th className={HEAD}>Joining date</th>
                  <th className={HEAD}>Employment duration</th>
                  <th className={HEAD}>Account status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No users match this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => {
                    const deactivated = u.status === "deactivated";
                    return (
                      <tr
                        key={u.id}
                        className={deactivated ? "opacity-60" : ""}
                      >
                        <td className="px-2 py-3">
                          <KebabMenu items={menuFor(u)} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                              {u.initials}
                            </span>
                            <span className="font-medium text-slate-800">
                              {u.name}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {ROLE_LABEL[u.role] || u.role}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {u.companyEmail || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <MultiValue value={u.personalEmail} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {u.companyPhone || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <MultiValue value={u.personalPhone} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {u.city || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {fmtSalary(u.salaryMonthly)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            styles={
                              EMP_STYLES[u.employmentStatus] ||
                              EMP_STYLES.full_time
                            }
                            label={EMP_LABEL[u.employmentStatus] || "—"}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(u.joiningDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {employmentDuration(u.joiningDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            styles={
                              STATUS_STYLES[u.status] ||
                              STATUS_STYLES.deactivated
                            }
                            label={STATUS_LABEL[u.status] || u.status}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <UserModal
        open={modal.open}
        initialMode={modal.mode}
        user={modal.user}
        existing={users}
        onSave={handleSave}
        onClose={closeModal}
      />
    </div>
  );
}
