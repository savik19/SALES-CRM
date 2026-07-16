"use client";

import { createContext, useContext, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Compensation & targets configuration (managed by the Admin).
// ---------------------------------------------------------------------------
// EVERYTHING here is a variable — salaries, targets, commission %, training
// length/amount, deductions — because company policy changes and every hire can
// be on a different package.
//
// Two layers:
//   1. ROLE DEFAULTS (`bdm`, `dsc`) — the package that applies to everyone in a
//      role unless overridden. This is what the Admin edits under "Company
//      defaults".
//   2. PER-PERSON OVERRIDES (`overrides[userId]`) — a partial package for one
//      individual. Only the fields present here override the role default; the
//      rest fall through. This lets you onboard a DSC on a lower/higher budget
//      (or a different target) without touching anyone else.
//
// The effective package for a person is `resolvePersonComp(config, role, id)`
// (see lib/analytics) = role default merged with that person's override. The DSC
// and BDM analytics read the effective package, so a change here — to a default
// OR to one person's override — reflects immediately in the right portal(s).
//
// Seeded from the ScriptGuru offer letters:
//   - DSC total ₹25,000/mo = 75% Fixed + 25% Performance Pay; 2-month training.
//   - BDM total ₹40,000/mo = ₹30,000 Fixed + ₹10,000 Performance Pay.
//   - Commission is paid ONLY when the full (100%) monthly target is met.
//
// The offer letters express the monthly target as revenue; per Prakhar's brief
// we model it as a monthly count of CLOSED (won) leads — the number is editable
// here either way.
//
// TODO(backend): persist via an API (GET/PUT /api/compensation) so the whole
// company shares one policy. For now it lives in localStorage.
// ---------------------------------------------------------------------------

// The fields that make up a role package. Keeping them named lets the override
// editor iterate the same schema for defaults and per-person packages.
export const BDM_FIELDS = [
  "salaryMonthly",
  "fixedPortionPct",
  "commissionPct",
  "monthlyLeadTarget",
];
export const DSC_FIELDS = [
  "baseSalaryMonthly",
  "trainingSalaryMonthly",
  "trainingMonths",
  "fixedPortionPct",
  "commissionPct",
  "monthlyLeadTarget",
];

export function fieldsForRole(role) {
  return role === "bdm" ? BDM_FIELDS : DSC_FIELDS;
}

// Presentation metadata for each package field (shared by the defaults form and
// the per-person override editor) so labels/units stay consistent everywhere.
export const FIELD_META = {
  salaryMonthly: { label: "Total monthly salary", suffix: "₹ / mo" },
  baseSalaryMonthly: {
    label: "Base monthly salary (post-training)",
    suffix: "₹ / mo",
  },
  trainingSalaryMonthly: { label: "Training salary", suffix: "₹ / mo" },
  trainingMonths: { label: "Training length", suffix: "months" },
  fixedPortionPct: { label: "Fixed portion", suffix: "%" },
  commissionPct: { label: "Commission", suffix: "%" },
  monthlyLeadTarget: { label: "Monthly target", suffix: "closed leads" },
};

export const DEFAULT_COMP = {
  currency: "INR",
  // Statutory-style deduction applied to gross pay (PF / professional tax…).
  deductionPct: 10,
  // ---- Role defaults -------------------------------------------------------
  bdm: {
    salaryMonthly: 40000, // total = Fixed 30,000 + Performance Pay 10,000
    fixedPortionPct: 75, // fixed part always paid; the rest is performance pay
    commissionPct: 5, // % of every sale (whole team), if company target met
    monthlyLeadTarget: 20, // company: total closed leads / month
  },
  dsc: {
    baseSalaryMonthly: 25000, // post-training total (Fixed 75% + Perf 25%)
    trainingSalaryMonthly: 15000, // during training (lower); configurable
    trainingMonths: 2, // training-cum-probation length
    fixedPortionPct: 75,
    commissionPct: 3, // % of the DSC's own sales, if their target met
    monthlyLeadTarget: 5, // each DSC: closed leads / month
  },
  // ---- Per-person overrides ------------------------------------------------
  // { [userId]: Partial<rolePackage> } — only the keys present override the
  // role default for that individual. Empty by default.
  overrides: {},
};

const STORAGE_KEY = "sg-crm-comp-v1";
const CompConfigContext = createContext(null);

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Merge a persisted config over the defaults so a config saved before a new
// field/section existed still gets it (forward-compatible migration).
function withDefaults(saved) {
  const base = clone(DEFAULT_COMP);
  if (!saved || typeof saved !== "object") return base;
  return {
    ...base,
    ...saved,
    bdm: { ...base.bdm, ...(saved.bdm || {}) },
    dsc: { ...base.dsc, ...(saved.dsc || {}) },
    overrides: saved.overrides || {},
  };
}

export function CompConfigProvider({ children }) {
  const [config, setConfig] = useState(() => clone(DEFAULT_COMP));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig(withDefaults(JSON.parse(raw)));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  function persist(next) {
    setConfig(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const api = {
    config,
    // Save an entire edited config (used by the Compensation admin screen).
    save(next) {
      persist(next);
    },
    resetToDefault() {
      persist(clone(DEFAULT_COMP));
    },
  };

  return (
    <CompConfigContext.Provider value={api}>
      {children}
    </CompConfigContext.Provider>
  );
}

export function useCompConfig() {
  const ctx = useContext(CompConfigContext);
  if (!ctx)
    throw new Error("useCompConfig must be used within CompConfigProvider");
  return ctx;
}
