"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { useCompConfig } from "@/lib/compConfig";

// ---------------------------------------------------------------------------
// Compensation & Targets (Admin) — manage salaries, targets, commission %,
// training length/amount, and deductions. Every value is editable; DSC and BDM
// analytics read these, so a change here reflects in their portals on Update.
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
          <span className="text-xs text-slate-400">{suffix}</span>
        ) : null}
      </div>
      {help ? <p className="mt-0.5 text-xs text-slate-400">{help}</p> : null}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

export default function CompensationPage() {
  const { config, save, resetToDefault } = useCompConfig();
  const [draft, setDraft] = useState(config);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Compensation & Targets"
        subtitle="Admin — salaries, targets, commission %, training and deductions. Changes reflect in the DSC and BDM analytics."
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
        ) : null}

        <Section title="BDM (manager)">
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
            label="Commission on every sale"
            value={draft.bdm.commissionPct}
            onChange={(v) => set("bdm.commissionPct", v)}
            suffix="%"
            help="Whole team's sales; paid only if company target met"
          />
          <NumberField
            label="Company monthly target"
            value={draft.bdm.monthlyLeadTarget}
            onChange={(v) => set("bdm.monthlyLeadTarget", v)}
            suffix="closed leads"
            help="Total closed leads for the team per month"
          />
        </Section>

        <Section title="DSC (consultant)">
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
            label="Commission on own sales"
            value={draft.dsc.commissionPct}
            onChange={(v) => set("dsc.commissionPct", v)}
            suffix="%"
            help="Paid only if the DSC's monthly target is met"
          />
          <NumberField
            label="DSC monthly target"
            value={draft.dsc.monthlyLeadTarget}
            onChange={(v) => set("dsc.monthlyLeadTarget", v)}
            suffix="closed leads"
            help="Each DSC must close at least this many per month"
          />
        </Section>

        <Section title="Deductions">
          <NumberField
            label="Statutory deduction (PF / tax)"
            value={draft.deductionPct}
            onChange={(v) => set("deductionPct", v)}
            suffix="%"
            help="Applied to gross pay to get net take-home"
          />
        </Section>

        <p className="text-xs text-slate-400">
          Seeded from the ScriptGuru offer letters. Stored in your browser for
          now — TODO(backend): persist via{" "}
          <code>GET/PUT /api/compensation</code> so the whole company shares one
          policy.
        </p>
      </div>
    </div>
  );
}
