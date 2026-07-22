"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import PersonCompTable from "@/components/settings/PersonCompTable";
import PersonCompModal from "@/components/settings/PersonCompModal";
import CatalogEditor from "@/components/settings/CatalogEditor";
import { useCompConfig, blankOffering } from "@/lib/compConfig";
import { useUsers } from "@/lib/usersConfig";

// ---------------------------------------------------------------------------
// Compensation & Targets (Admin).
// ---------------------------------------------------------------------------
// Two layers, edited here and read live by the DSC/BDM analytics:
//   1. Company defaults — the package for everyone in a role.
//   2. Per-person overrides — a custom package for one individual (e.g. a DSC
//      onboarded on a different budget or target).
// Edits are staged in a draft and committed with Update, so the whole config
// (defaults + overrides) is saved atomically.
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

function NumberField({ label, value, onChange, suffix, help }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={inputClass}
          value={value}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
        />
        {suffix ? (
          <span className="shrink-0 text-xs text-slate-400">{suffix}</span>
        ) : null}
      </div>
      {help ? <p className="mt-0.5 text-xs text-slate-400">{help}</p> : null}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}

export default function CompensationPage() {
  const { config, save, resetToDefault } = useCompConfig();
  const { users } = useUsers();
  const [draft, setDraft] = useState(config);
  const [saved, setSaved] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => setDraft(config), [config]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  function set(path, value) {
    setSaved(false);
    setDraft((d) => {
      const next = JSON.parse(JSON.stringify(d));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  // ---- Catalog (Services / Products) editing on the draft ------------------
  const catalogKey = (kind) => (kind === "product" ? "products" : "services");

  function addOffering(kind) {
    setSaved(false);
    setDraft((d) => {
      const next = JSON.parse(JSON.stringify(d));
      const key = catalogKey(kind);
      const id = `${kind === "product" ? "prd" : "svc"}-${Date.now().toString(36)}`;
      next[key] = [...(next[key] || []), blankOffering(kind, id)];
      return next;
    });
  }
  function changeOffering(kind, id, patch) {
    setSaved(false);
    setDraft((d) => {
      const next = JSON.parse(JSON.stringify(d));
      const key = catalogKey(kind);
      next[key] = (next[key] || []).map((o) =>
        o.id === id ? { ...o, ...patch } : o
      );
      return next;
    });
  }
  function removeOffering(kind, id) {
    setSaved(false);
    setDraft((d) => {
      const next = JSON.parse(JSON.stringify(d));
      const key = catalogKey(kind);
      next[key] = (next[key] || []).filter((o) => o.id !== id);
      return next;
    });
  }

  // Store (or clear) one person's override in the draft.
  function setOverride(userId, overrideOrNull) {
    setSaved(false);
    setDraft((d) => {
      const next = JSON.parse(JSON.stringify(d));
      next.overrides = next.overrides || {};
      if (overrideOrNull) next.overrides[userId] = overrideOrNull;
      else delete next.overrides[userId];
      return next;
    });
  }

  // The "inherited default" the override editor shows. A person's own monthly
  // salary (User Management) stands in for the role's base-salary default, so
  // customizing salary is relative to what they're actually on.
  const roleDefaultFor = (user) => {
    const base = user.role === "bdm" ? draft.bdm : draft.dsc;
    const salaryKey =
      user.role === "bdm" ? "salaryMonthly" : "baseSalaryMonthly";
    return user.salaryMonthly != null
      ? { ...base, [salaryKey]: user.salaryMonthly }
      : base;
  };

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Compensation & Targets"
        subtitle="Admin — company defaults per role, plus per-person overrides. Changes reflect live in the DSC and BDM analytics."
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetToDefault();
                setSaved(false);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={() => {
                save(draft);
                setSaved(true);
              }}
              disabled={!dirty}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Update
            </button>
          </div>
        }
      />

      <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
        {saved ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✅ Saved. The DSC and BDM analytics now use these figures.
          </p>
        ) : dirty ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Unsaved changes — press Update to apply them to the analytics.
          </p>
        ) : null}

        {/* -------- Company defaults (first) -------- */}
        <Section
          title="BDM — company default"
          subtitle="Applies to every BDM unless overridden above. Commission is set per offering in the Services & Products catalog below."
        >
          <Grid>
            <NumberField
              label="Total monthly salary"
              value={draft.bdm.salaryMonthly}
              onChange={(v) => set("bdm.salaryMonthly", v)}
              suffix="₹ / mo"
              help="Fixed part + performance pay"
            />
            <NumberField
              label="Fixed portion"
              value={draft.bdm.fixedPortionPct}
              onChange={(v) => set("bdm.fixedPortionPct", v)}
              suffix="%"
              help="Always paid; the rest is performance pay (target-gated)"
            />
            <NumberField
              label="Company monthly target"
              value={draft.bdm.monthlyDealTarget}
              onChange={(v) => set("bdm.monthlyDealTarget", v)}
              suffix="deals won"
              help="Total deals the team must win per month"
            />
          </Grid>
        </Section>

        <Section
          title="DSC — company default"
          subtitle="Applies to every DSC unless overridden above. Commission is set per offering in the Services & Products catalog below."
        >
          <Grid>
            <NumberField
              label="Base monthly salary (post-training)"
              value={draft.dsc.baseSalaryMonthly}
              onChange={(v) => set("dsc.baseSalaryMonthly", v)}
              suffix="₹ / mo"
            />
            <NumberField
              label="Training salary"
              value={draft.dsc.trainingSalaryMonthly}
              onChange={(v) => set("dsc.trainingSalaryMonthly", v)}
              suffix="₹ / mo"
              help="Paid during the training-cum-probation period"
            />
            <NumberField
              label="Training length"
              value={draft.dsc.trainingMonths}
              onChange={(v) => set("dsc.trainingMonths", v)}
              suffix="months"
            />
            <NumberField
              label="Fixed portion"
              value={draft.dsc.fixedPortionPct}
              onChange={(v) => set("dsc.fixedPortionPct", v)}
              suffix="%"
            />
            <NumberField
              label="DSC monthly target"
              value={draft.dsc.monthlyDealTarget}
              onChange={(v) => set("dsc.monthlyDealTarget", v)}
              suffix="deals won"
              help="Each DSC must win at least this many deals per month"
            />
          </Grid>
        </Section>

        <Section title="Deductions">
          <Grid>
            <NumberField
              label="Statutory deduction (PF / tax)"
              value={draft.deductionPct}
              onChange={(v) => set("deductionPct", v)}
              suffix="%"
              help="Applied to gross pay to get net take-home"
            />
          </Grid>
        </Section>

        {/* -------- Commission catalog (Services & Products) -------- */}
        <Section
          title="Services & Products — commission catalog"
          subtitle="What the company sells and what closing each one pays. Services usually pay a flat amount; SaaS/subscription products pay a % of the plan value. The BDM override is what the manager earns on the same sale. These rates feed the DSC and BDM commission in the analytics."
        >
          <div className="space-y-5">
            <CatalogEditor
              title="Services"
              subtitle="One-off engagements — typically a flat commission per sale."
              addLabel="Add service"
              items={draft.services || []}
              onAdd={() => addOffering("service")}
              onChange={(id, patch) => changeOffering("service", id, patch)}
              onRemove={(id) => removeOffering("service", id)}
            />
            <CatalogEditor
              title="Products (SaaS / subscription)"
              subtitle="Fixed-price plans — typically a % of the plan value."
              addLabel="Add product"
              items={draft.products || []}
              onAdd={() => addOffering("product")}
              onChange={(id, patch) => changeOffering("product", id, patch)}
              onRemove={(id) => removeOffering("product", id)}
            />
          </div>
        </Section>

        {/* -------- Per-person overrides (after the defaults) -------- */}
        <Section
          title="Per-person compensation"
          subtitle="Each person follows their role default unless customized here. A person's own monthly salary (set in User Management) is their post-training base; customize below to onboard someone on a different salary, commission or target."
        >
          <PersonCompTable
            users={users}
            draft={draft}
            onEdit={setEditUser}
            onReset={(id) => setOverride(id, null)}
          />
        </Section>
      </div>

      <PersonCompModal
        open={!!editUser}
        user={editUser}
        roleDefault={editUser ? roleDefaultFor(editUser) : {}}
        override={editUser ? draft.overrides?.[editUser.id] : null}
        onSave={(override) => {
          if (editUser) setOverride(editUser.id, override);
          setEditUser(null);
        }}
        onClose={() => setEditUser(null)}
      />
    </div>
  );
}
