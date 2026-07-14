"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TEAM, registerUsers } from "@/data/mockLeads";

// ---------------------------------------------------------------------------
// User Management store (managed by the Admin).
// ---------------------------------------------------------------------------
// The Admin adds/edits the team (BDMs + DSCs) with full HR details, deactivates
// people who leave, and invites new joiners by email so they can set a password
// and log in. Everything the rest of the app needs to know about "who works
// here" comes from THIS store:
//   - the role switcher lists active users
//   - lead assignment / filters / analytics list active DSCs
//   - dscName() lookups resolve through the live registry (see mockLeads)
//
// Frontend-only for now: seeded from mockLeads.TEAM, persisted to localStorage.
// TODO(backend): replace the whole store with the real API —
//   GET  /api/users                 list team (role, status, HR details)
//   POST /api/users                 add a user  (status "invited")
//   PUT  /api/users/:id             edit details
//   PATCH/api/users/:id/status      activate / deactivate
//   POST /api/users/:id/invite      (re)send the invite email
// The invite email + password-setup flow (magic link / set-password page) is a
// backend concern; the UI just calls the endpoint and shows the result.
//
// `status` lifecycle:
//   invited     — added by admin; invite email sent; hasn't set a password yet
//   active      — has logged in and is working; appears in assignment/switcher
//   deactivated — left the company; hidden everywhere, but kept for history
// ---------------------------------------------------------------------------

const STORAGE_KEY = "sg-crm-users-v1";
const UsersContext = createContext(null);

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic id from name + a counter — no Math.random (breaks SSR/replay).
function makeId(name, existing) {
  const slug =
    (name || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "user";
  let id = `u-${slug}`;
  let n = 2;
  while (existing.some((u) => u.id === id)) id = `u-${slug}-${n++}`;
  return id;
}

// A fresh user record with sane defaults (admin fills the rest in the form).
export function blankUser() {
  return {
    id: "",
    name: "",
    role: "dsc",
    email: "",
    mobile: "",
    address: "",
    city: "",
    salaryMonthly: null,
    status: "invited",
    joinedMonthsAgo: 0,
  };
}

export function UsersProvider({ children }) {
  const [users, setUsers] = useState(() => clone(TEAM));

  // Load any admin edits from a previous session.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) setUsers(saved);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  // Keep the mockLeads registry (pure dscName lookups) in sync with the store,
  // so renamed/added users show their real name everywhere without prop-drilling.
  useEffect(() => {
    registerUsers(users);
  }, [users]);

  function persist(next) {
    setUsers(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const api = useMemo(() => {
    return {
      users,

      // Add a user. New joiners start as "invited" (invite email is sent by the
      // backend). Returns the created record.
      addUser(draft) {
        const id = makeId(draft.name, users);
        const user = {
          ...blankUser(),
          ...draft,
          id,
          initials: initials(draft.name),
          status: draft.status || "invited",
        };
        persist([...users, user]);
        return user;
      },

      // Edit an existing user's details (not the id).
      updateUser(id, patch) {
        persist(
          users.map((u) =>
            u.id === id
              ? {
                  ...u,
                  ...patch,
                  initials: patch.name ? initials(patch.name) : u.initials,
                }
              : u
          )
        );
      },

      setStatus(id, status) {
        persist(users.map((u) => (u.id === id ? { ...u, status } : u)));
      },

      // (Re)send the invite email. Frontend stub — flips the user to "invited"
      // and records that a link went out. Real send happens on the backend.
      // TODO(backend): POST /api/users/:id/invite → sends the email + magic link.
      resendInvite(id) {
        persist(users.map((u) => (u.id === id ? { ...u, status: "invited" } : u)));
      },

      resetToSeed() {
        persist(clone(TEAM));
      },
    };
  }, [users]);

  return <UsersContext.Provider value={api}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}

// ---- Derived selectors (hooks) --------------------------------------------
// Convenience views the rest of the app consumes. Kept as a hook so components
// re-render when the admin changes the team.

export function useActiveUsers() {
  const { users } = useUsers();
  // Anyone who can currently log in and be assigned work: not deactivated.
  return useMemo(
    () => users.filter((u) => u.status !== "deactivated"),
    [users]
  );
}

export function useActiveDscs() {
  const { users } = useUsers();
  return useMemo(
    () => users.filter((u) => u.role === "dsc" && u.status !== "deactivated"),
    [users]
  );
}

export function useUserCounts() {
  const { users } = useUsers();
  return useMemo(() => {
    const count = (role, status) =>
      users.filter(
        (u) => u.role === role && (status ? u.status === status : true)
      ).length;
    return {
      dscTotal: count("dsc"),
      dscActive: users.filter(
        (u) => u.role === "dsc" && u.status === "active"
      ).length,
      bdmTotal: count("bdm"),
      bdmActive: users.filter(
        (u) => u.role === "bdm" && u.status === "active"
      ).length,
      invited: users.filter((u) => u.status === "invited").length,
      deactivated: users.filter((u) => u.status === "deactivated").length,
    };
  }, [users]);
}
