"use client";

import { useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import UserFormModal from "@/components/users/UserFormModal";
import { useUsers, useUserCounts } from "@/lib/usersConfig";

// ---------------------------------------------------------------------------
// User Management (Admin) — the admin adds the BDMs and DSCs with all their
// details, sees how many of each the company has, deactivates anyone who leaves,
// and invites new joiners by email so they can set a password and log in.
// Frontend-only for now (mock store); the API swap points live in usersConfig.
// ---------------------------------------------------------------------------

const ROLE_LABEL = { admin: "Admin", bdm: "BDM", dsc: "DSC" };

const STATUS_STYLES = {
  active: "bg-green-50 text-green-700 ring-green-600/20",
  invited: "bg-amber-50 text-amber-700 ring-amber-600/20",
  deactivated: "bg-slate-100 text-slate-500 ring-slate-400/20",
};
const STATUS_LABEL = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STATUS_STYLES[status] || STATUS_STYLES.deactivated
      }`}
    >
      {STATUS_LABEL[status] || status}
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

export default function UsersPage() {
  const { users, addUser, updateUser, setStatus, resendInvite } = useUsers();
  const counts = useUserCounts();

  const [modal, setModal] = useState({ open: false, mode: "add", user: null });
  const [roleFilter, setRoleFilter] = useState("all"); // all | bdm | dsc
  const [showDeactivated, setShowDeactivated] = useState(true);
  const [flash, setFlash] = useState("");

  const rows = useMemo(() => {
    return users
      .filter((u) => u.role !== "admin") // the admin manages the team, not itself
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) => (showDeactivated ? true : u.status !== "deactivated"))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, roleFilter, showDeactivated]);

  function notify(msg) {
    setFlash(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setFlash(""), 4000);
  }

  function handleSave(draft) {
    if (modal.mode === "edit") {
      updateUser(draft.id, draft);
      notify(`Saved ${draft.name}'s details.`);
    } else {
      const created = addUser(draft);
      notify(
        `Added ${created.name}. Invite email sent to ${created.email} — they can set a password and log in.`
      );
    }
    setModal({ open: false, mode: "add", user: null });
  }

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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
            {[
              { key: "all", label: "All" },
              { key: "bdm", label: "BDMs" },
              { key: "dsc", label: "DSCs" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setRoleFilter(t.key)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  roleFilter === t.key
                    ? "bg-brand text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="ml-1 inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showDeactivated}
              onChange={(e) => setShowDeactivated(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            Show deactivated
          </label>
        </div>

        {/* Team table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                              {u.initials}
                            </span>
                            <span className="font-medium text-slate-800">
                              {u.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {ROLE_LABEL[u.role] || u.role}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div>{u.email}</div>
                          {u.mobile ? (
                            <div className="text-xs text-slate-400">
                              {u.mobile}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {u.city || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {fmtSalary(u.salaryMonthly)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setModal({ open: true, mode: "edit", user: u })
                              }
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            {u.status === "invited" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  resendInvite(u.id);
                                  notify(`Invite re-sent to ${u.email}.`);
                                }}
                                className="rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                              >
                                Resend invite
                              </button>
                            ) : null}
                            {deactivated ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatus(u.id, "active");
                                  notify(`${u.name} reactivated.`);
                                }}
                                className="rounded-md border border-green-300 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatus(u.id, "deactivated");
                                  notify(
                                    `${u.name} deactivated — they can no longer log in or receive leads.`
                                  );
                                }}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Frontend build — this team is stored in your browser for now.
          TODO(backend): wire <code>GET/POST/PUT /api/users</code>, the status
          endpoints, and the real invite-email + set-password flow. See{" "}
          <code>src/lib/usersConfig.jsx</code>.
        </p>
      </div>

      <UserFormModal
        open={modal.open}
        mode={modal.mode}
        user={modal.user}
        existing={users}
        onSave={handleSave}
        onClose={() => setModal({ open: false, mode: "add", user: null })}
      />
    </div>
  );
}
