"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { COLUMNS as DEFAULT_COLUMNS } from "@/components/leads/columns";

// ---------------------------------------------------------------------------
// Editable column configuration (labels + sheet-header aliases + import flag +
// add/remove columns). Frontend-only: seeded from the defaults, edits persist to
// localStorage so the demo remembers them across reloads.
//
// TODO(backend): replace localStorage with an API — GET /api/columns to load
// and PUT /api/columns to save. The shape is the same columns array used here.
// ---------------------------------------------------------------------------

// v2: the money columns (Quoted/Closed/Discount/Lost Reason) moved off the lead
// onto the deal — bump the key so saved configs re-seed from the new defaults.
const STORAGE_KEY = "sg-crm-columns-v3";
const ColumnConfigContext = createContext(null);

function cloneDefaults() {
  return DEFAULT_COLUMNS.map((c) => ({
    ...c,
    aliases: [...(c.aliases || [])],
  }));
}

export function ColumnConfigProvider({ children }) {
  const [columns, setColumns] = useState(cloneDefaults);

  // Hydrate from localStorage on the client (kept out of initial render to
  // avoid SSR hydration mismatches).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) setColumns(saved);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  function persist(next) {
    setColumns(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / unavailable */
    }
  }

  const api = {
    columns,
    // Replace the whole columns array (used by the Column Mapping "Update").
    replaceAll(next) {
      persist(next);
    },
    // Edit a column's display name (its stable key/ID is unchanged).
    setLabel(key, label) {
      persist(columns.map((c) => (c.key === key ? { ...c, label } : c)));
    },
    // Replace the sheet-header aliases for a column.
    setAliases(key, aliases) {
      persist(columns.map((c) => (c.key === key ? { ...c, aliases } : c)));
    },
    // Toggle whether this column is expected in the import sheet.
    toggleImportSheet(key) {
      persist(
        columns.map((c) =>
          c.key === key ? { ...c, inImportSheet: !c.inImportSheet } : c
        )
      );
    },
    // Add a new CRM-only custom column.
    addColumn({ label, group = "Custom" }) {
      const base = label.trim() || "New Column";
      let key = "custom_" + base.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      let n = 1;
      while (columns.some((c) => c.key === key)) key = `${key}_${++n}`;
      persist([
        ...columns,
        {
          key,
          label: base,
          group,
          defaultVisible: true,
          sortType: "text",
          searchable: false,
          inImportSheet: false,
          aliases: [],
          width: 160,
          custom: true,
        },
      ]);
    },
    // Remove a column (built-in or custom).
    removeColumn(key) {
      persist(columns.filter((c) => c.key !== key));
    },
    // Restore the shipped defaults.
    resetToDefault() {
      persist(cloneDefaults());
    },
  };

  return (
    <ColumnConfigContext.Provider value={api}>
      {children}
    </ColumnConfigContext.Provider>
  );
}

export function useColumnConfig() {
  const ctx = useContext(ColumnConfigContext);
  if (!ctx)
    throw new Error("useColumnConfig must be used within ColumnConfigProvider");
  return ctx;
}
