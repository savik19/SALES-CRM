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

// ---- Commission catalog ---------------------------------------------------
// The company sells "offerings" — Services (usually one-off) and Products (SaaS
// / subscriptions). The Admin maintains this catalog; it is the SINGLE SOURCE OF
// TRUTH for what selling each offering pays. Commission is set PER ROLE, because
// a BDM earns a manager override on the same sale a DSC closes (usually higher).
//
// A commission rule = { type, value }:
//   type "fixed"   → a flat ₹ amount per sale (typical for services)
//   type "percent" → a % of the line-item amount / contract value (typical for
//                    subscription products, where the price is well-defined)
//
// An offering = {
//   id, name,
//   kind: "service" | "product",
//   dsc: { type, value },   // what the closing DSC earns
//   bdm: { type, value },   // the manager override the BDM earns on that sale
//   active,                 // inactive offerings can't be added to new deals
// }
// A won Deal carries line items (offeringId + amount); see lib/commission.js for
// the pure math that turns those into each person's commission.
export const COMMISSION_TYPES = ["fixed", "percent"];
export const OFFERING_KINDS = ["service", "product"];

// Blank offering of a given kind (services default to fixed, products to %).
export function blankOffering(kind, id) {
  const isProduct = kind === "product";
  const rule = () =>
    isProduct ? { type: "percent", value: 0 } : { type: "fixed", value: 0 };
  return { id, name: "", kind, dsc: rule(), bdm: rule(), active: true };
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
  // Zero for now — the company isn't deducting PF/tax yet; the Admin can set it
  // later without any code change.
  deductionPct: 0,
  // ---- Commission catalog (Services & Products) ----------------------------
  // Seeded from ScriptGuru's offerings; every field is Admin-editable. Services
  // pay a flat amount; the SaaS product pays a % of the plan value. BDM rates are
  // the manager override on the same sale (higher than the DSC's).
  services: [
    {
      id: "svc-custom-software",
      name: "Custom Software",
      kind: "service",
      dsc: { type: "fixed", value: 5000 },
      bdm: { type: "fixed", value: 8000 },
      active: true,
    },
    {
      id: "svc-website",
      name: "Website Development",
      kind: "service",
      dsc: { type: "fixed", value: 3000 },
      bdm: { type: "fixed", value: 5000 },
      active: true,
    },
    {
      id: "svc-digital-marketing",
      name: "Digital Marketing",
      kind: "service",
      dsc: { type: "fixed", value: 3000 },
      bdm: { type: "fixed", value: 5000 },
      active: true,
    },
    {
      id: "svc-ai-tools",
      name: "AI Tools",
      kind: "service",
      dsc: { type: "fixed", value: 4000 },
      bdm: { type: "fixed", value: 6000 },
      active: true,
    },
    {
      id: "svc-mobile-app",
      name: "Mobile App",
      kind: "service",
      dsc: { type: "fixed", value: 5000 },
      bdm: { type: "fixed", value: 8000 },
      active: true,
    },
  ],
  products: [
    {
      id: "prd-saas-subscription",
      name: "SaaS Subscription",
      kind: "product",
      dsc: { type: "percent", value: 3 },
      bdm: { type: "percent", value: 5 },
      active: true,
    },
  ],
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
    // Catalog arrays: use the saved list if present, else seed from defaults.
    services: Array.isArray(saved.services) ? saved.services : base.services,
    products: Array.isArray(saved.products) ? saved.products : base.products,
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
