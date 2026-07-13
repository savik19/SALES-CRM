"use client";

import { createContext, useContext, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Compensation & targets configuration (managed by the Admin).
// ---------------------------------------------------------------------------
// EVERYTHING here is a variable — salaries, targets, commission %, training
// length/amount, deductions, probation — because company policy changes. The
// Admin edits these on the Compensation screen; the DSC and BDM analytics read
// them, so a change reflects immediately in the respective portals.
//
// Seeded from the ScriptGuru offer letters:
//   - DSC total ₹25,000/mo = 75% Fixed + 25% Performance Pay; 2-month training.
//   - BDM total ₹40,000/mo = ₹30,000 Fixed + ₹10,000 Performance Pay.
//   - Commission is paid ONLY when the full (100%) monthly target is met.
//
// The offer letters express the monthly target as revenue; per Prakhar's brief
// we model it as a monthly count of CLOSED (won) leads (DSC target, company
// target) — the number itself is editable here either way.
//
// TODO(backend): persist via an API (GET/PUT /api/compensation) so the whole
// company shares one policy. For now it lives in localStorage.
// ---------------------------------------------------------------------------

export const DEFAULT_COMP = {
  currency: "INR",
  // Statutory-style deduction applied to gross pay (PF / professional tax…).
  deductionPct: 10,
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
};

const STORAGE_KEY = "sg-crm-comp-v1";
const CompConfigContext = createContext(null);

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function CompConfigProvider({ children }) {
  const [config, setConfig] = useState(() => clone(DEFAULT_COMP));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig({ ...clone(DEFAULT_COMP), ...JSON.parse(raw) });
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
