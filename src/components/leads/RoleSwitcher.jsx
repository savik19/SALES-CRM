"use client";

import { useActiveUsers } from "@/lib/usersConfig";

// Demo-only viewer switcher (BDM / each DSC). Real auth replaces this — the
// backend derives the role and scopes leads server-side. Lists only active
// users (the same people the Admin manages in User Management); a deactivated
// user disappears here just as they'd lose portal access for real.
export default function RoleSwitcher({ viewerId, onChange }) {
  const users = useActiveUsers();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="hidden sm:inline">Viewing as</span>
      <select
        value={viewerId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} · {u.role.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
