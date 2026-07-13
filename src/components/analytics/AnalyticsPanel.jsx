"use client";

import { formatINR } from "@/lib/format";
import { isWon, isDead } from "@/lib/analytics";

// ---- small building blocks -------------------------------------------------

function StatTile({ label, value, sub, tone = "default" }) {
  const valueTone =
    tone === "good"
      ? "text-green-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${valueTone}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

// A target progress meter: closed / target with a filled bar.
function TargetMeter({ label, done, target }) {
  const pct = target > 0 ? Math.min(100, (done / target) * 100) : 0;
  const met = done >= target && target > 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span
          className={`text-xs font-semibold ${met ? "text-green-600" : "text-slate-500"}`}
        >
          {done} / {target} {met ? "· met ✓" : ""}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${met ? "bg-green-500" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {Math.round(pct)}% of monthly target
      </div>
    </div>
  );
}

function money(n) {
  return formatINR(Math.round(n || 0));
}

// Earnings breakdown card. Performance Pay + Commission are gated on the target.
function EarningsCard({ title, e }) {
  const rows = e.inTraining
    ? [{ label: "Training salary", value: e.fixed }]
    : [
        { label: "Fixed salary (75%)", value: e.fixed, paid: true },
        {
          label: "Performance pay (25%)",
          value: e.performancePay,
          paid: e.targetMet,
        },
        { label: "Commission", value: e.commission, paid: e.targetMet },
      ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {e.inTraining ? (
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
            In training
          </span>
        ) : e.targetMet ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Target met · commission unlocked
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Target not met · commission withheld
          </span>
        )}
      </div>
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-1.5"
          >
            <dt className="text-slate-600">
              {r.label}
              {r.paid === false ? (
                <span className="ml-1 text-xs text-amber-600">(withheld)</span>
              ) : null}
            </dt>
            <dd
              className={`tabular-nums ${
                r.paid === false
                  ? "text-slate-400 line-through"
                  : "text-slate-800"
              }`}
            >
              {money(r.value)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-slate-600">Deductions (PF / tax)</dt>
          <dd className="tabular-nums text-red-600">− {money(e.deductions)}</dd>
        </div>
        <div className="flex items-center justify-between py-2">
          <dt className="font-semibold text-slate-800">Net take-home</dt>
          <dd className="text-base font-semibold tabular-nums text-slate-900">
            {money(e.net)}
          </dd>
        </div>
      </dl>
      {!e.inTraining && !e.targetMet && e.atRisk > 0 ? (
        <p className="mt-2 text-xs text-amber-600">
          {money(e.atRisk)} unlocks when {e.target} deals close this month
          (currently {e.closedCount}).
        </p>
      ) : null}
    </div>
  );
}

// Compact status distribution bars.
function StatusBars({ byStatus, total }) {
  const rows = Object.entries(byStatus).filter(([, n]) => n > 0);
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-800">
        Leads by status
      </h4>
      <div className="space-y-1.5">
        {rows.map(([status, n]) => {
          const pct = total ? (n / total) * 100 : 0;
          const color = isWon(status)
            ? "bg-green-500"
            : isDead(status)
              ? "bg-red-400"
              : status === "On Hold"
                ? "bg-amber-400"
                : "bg-brand";
          return (
            <div key={status} className="flex items-center gap-2 text-xs">
              <span className="w-36 shrink-0 truncate text-slate-600">
                {status}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-slate-500">
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- views -----------------------------------------------------------------

function DscView({ name, data }) {
  const { metrics: m, earnings: e } = data;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="My leads" value={m.total} />
        <StatTile label="Closed (won)" value={m.won} tone="good" />
        <StatTile label="Conversion" value={`${Math.round(m.conversion)}%`} />
        <StatTile
          label="Follow-ups due"
          value={m.followUpsDue}
          tone={m.followUpsDue ? "warn" : "default"}
        />
        <StatTile label="Pipeline value" value={money(m.pipelineValue)} />
        <StatTile label="Won value" value={money(m.wonValue)} tone="good" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TargetMeter
          label="Monthly leads target"
          done={m.won}
          target={e.target}
        />
        <div className="lg:col-span-2">
          <EarningsCard title={`${name} · earnings this month`} e={e} />
        </div>
      </div>
    </div>
  );
}

function TeamView({ data }) {
  const {
    companyMetrics: m,
    perDsc,
    bdmEarnings,
    companyTarget,
    companyClosed,
  } = data;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Team leads" value={m.total} />
        <StatTile label="Closed (won)" value={m.won} tone="good" />
        <StatTile label="Conversion" value={`${Math.round(m.conversion)}%`} />
        <StatTile label="Won value" value={money(m.wonValue)} tone="good" />
        <StatTile label="Pipeline value" value={money(m.pipelineValue)} />
        <StatTile
          label="Follow-ups due"
          value={m.followUpsDue}
          tone={m.followUpsDue ? "warn" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TargetMeter
          label="Company monthly target"
          done={companyClosed}
          target={companyTarget}
        />
        <div className="lg:col-span-2">
          <StatusBars byStatus={m.byStatus} total={m.total} />
        </div>
      </div>

      {/* Per-DSC breakdown */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold text-slate-600">DSC</th>
              <th className="px-4 py-2 font-semibold text-slate-600">Leads</th>
              <th className="px-4 py-2 font-semibold text-slate-600">Closed</th>
              <th className="px-4 py-2 font-semibold text-slate-600">Target</th>
              <th className="px-4 py-2 font-semibold text-slate-600">
                Won value
              </th>
              <th className="px-4 py-2 font-semibold text-slate-600">
                Net earnings
              </th>
            </tr>
          </thead>
          <tbody>
            {perDsc.map(({ dsc, metrics, earnings }) => (
              <tr key={dsc.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">
                  {dsc.name}
                </td>
                <td className="px-4 py-2 tabular-nums text-slate-600">
                  {metrics.total}
                </td>
                <td className="px-4 py-2 tabular-nums text-slate-600">
                  {metrics.won}
                </td>
                <td className="px-4 py-2">
                  {earnings.inTraining ? (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
                      Training
                    </span>
                  ) : earnings.targetMet ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      {metrics.won}/{earnings.target} ✓
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {metrics.won}/{earnings.target}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 tabular-nums text-slate-600">
                  {money(metrics.wonValue)}
                </td>
                <td className="px-4 py-2 tabular-nums font-medium text-slate-800">
                  {money(earnings.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EarningsCard title="BDM · earnings this month" e={bdmEarnings} />
    </div>
  );
}

// Role-aware analytics panel. `variant` is "dsc" (own) or "team" (BDM/Admin).
export default function AnalyticsPanel({ variant, dscName, data }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {variant === "dsc" ? "My performance" : "Team performance"}
        </h3>
        <span className="text-xs text-slate-400">· this month</span>
      </div>
      {variant === "dsc" ? (
        <DscView name={dscName} data={data} />
      ) : (
        <TeamView data={data} />
      )}
    </div>
  );
}
