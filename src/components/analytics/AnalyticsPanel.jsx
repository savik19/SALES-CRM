"use client";

import { formatINR, monthLabel } from "@/lib/format";
import { isWon, isDead } from "@/lib/analytics";

// ---- small building blocks -------------------------------------------------

// Hover info: a small "i" that reveals an explanation of the metric.
function InfoDot({ text }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <span className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px] font-bold leading-none text-slate-400">
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-56 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-white shadow-lg group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

function StatTile({ label, value, sub, tone = "default", info }) {
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
      <div className="flex items-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span>{label}</span>
        {info ? <InfoDot text={info} /> : null}
      </div>
      <div className={`mt-1 text-xl font-semibold ${valueTone}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

// A target progress meter: closed / target with a filled bar.
function TargetMeter({ label, done, target, info }) {
  const pct = target > 0 ? Math.min(100, (done / target) * 100) : 0;
  const met = done >= target && target > 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span>{label}</span>
          {info ? <InfoDot text={info} /> : null}
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
function EarningsCard({ title, e, monthLbl }) {
  const fixedPct = e.fixedPortionPct ?? 75;
  const rows = e.inTraining
    ? [{ label: "Training salary", value: e.fixed }]
    : [
        { label: `Fixed salary (${fixedPct}%)`, value: e.fixed, paid: true },
        {
          label: `Performance pay (${100 - fixedPct}%)`,
          value: e.performancePay,
          paid: e.targetMet,
        },
        {
          label: "Commission (catalog · finalized)",
          value: e.commission,
          paid: e.targetMet,
        },
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
      {e.pendingCommission > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          {money(e.pendingCommission)} commission in the 3-month hold —
          finalizes after the quarter (reversed if the deal cancels).
        </p>
      ) : null}
      {!e.inTraining && !e.targetMet && e.atRisk > 0 ? (
        <p className="mt-2 text-xs text-amber-600">
          {money(e.atRisk)} unlocks when {e.target} deals close in {monthLbl}{" "}
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
      <h4 className="mb-2 flex items-center text-sm font-semibold text-slate-800">
        Leads by status
        <InfoDot text="Current distribution of all leads by status (all-time, not limited to the selected month)." />
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

function DscView({ name, monthLbl, data }) {
  const { metrics: m, earnings: e } = data;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Total leads"
          value={m.totalLeads}
          info={`Every lead ever assigned to you — any status (new, won, lost…). Not limited to ${monthLbl}.`}
        />
        <StatTile
          label="Uncontacted"
          value={m.uncontacted}
          tone={m.uncontacted ? "warn" : "default"}
          info="Leads assigned to you that you haven't contacted yet (no last-contact date). All-time, not limited to the month."
        />
        <StatTile
          label="New assigned"
          value={m.newAssigned}
          info={`Leads newly assigned to you in ${monthLbl}.`}
        />
        <StatTile
          label="Contacted"
          value={m.contacted}
          info={`Leads you contacted (last contact date falls in ${monthLbl}) — e.g. called or messaged.`}
        />
        <StatTile
          label="Meeting scheduled"
          value={m.meetingScheduled}
          info={`Leads at "Meeting Scheduled" that you worked in ${monthLbl}.`}
        />
        <StatTile
          label="Meeting done"
          value={m.meetingDone}
          info={`Leads at "Meeting Done" that you worked in ${monthLbl}.`}
        />
        <StatTile
          label="Follow-ups due"
          value={m.followUpsDue}
          tone={m.followUpsDue ? "warn" : "default"}
          info={`Leads with a follow-up scheduled in ${monthLbl}.`}
        />
        <StatTile
          label="Closed (won)"
          value={m.won}
          tone="good"
          info={`Leads you won/closed in ${monthLbl}.`}
        />
        <StatTile
          label="Pipeline value"
          value={money(m.pipelineValue)}
          info={`Total quoted value of your open pipeline leads worked in ${monthLbl} (proposals sent / quotations made).`}
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
        <TargetMeter
          label="Monthly leads target"
          done={m.won}
          target={e.target}
          info={`Leads won in ${monthLbl} vs your monthly target. Meeting it unlocks performance pay + commission.`}
        />
        <div className="lg:col-span-2">
          <EarningsCard
            title={`${name} · earnings · ${monthLbl}`}
            e={e}
            monthLbl={monthLbl}
          />
        </div>
      </div>
    </div>
  );
}

function TeamView({ monthLbl, data }) {
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
        <StatTile
          label="Total leads"
          value={m.totalLeads}
          info="Every lead across the team — any status. Not limited to the selected month."
        />
        <StatTile
          label="Uncontacted"
          value={m.uncontacted}
          tone={m.uncontacted ? "warn" : "default"}
          info="Team leads not contacted yet (no last-contact date). All-time, not limited to the month."
        />
        <StatTile
          label="New assigned"
          value={m.newAssigned}
          info={`Leads newly assigned to the team in ${monthLbl}.`}
        />
        <StatTile
          label="Contacted"
          value={m.contacted}
          info={`Leads the team contacted in ${monthLbl}.`}
        />
        <StatTile
          label="Meeting scheduled"
          value={m.meetingScheduled}
          info={`Team leads at "Meeting Scheduled" worked in ${monthLbl}.`}
        />
        <StatTile
          label="Meeting done"
          value={m.meetingDone}
          info={`Team leads at "Meeting Done" worked in ${monthLbl}.`}
        />
        <StatTile
          label="Closed (won)"
          value={m.won}
          tone="good"
          info={`Leads the team won/closed in ${monthLbl}.`}
        />
        <StatTile
          label="Won value"
          value={money(m.wonValue)}
          tone="good"
          info={`Total closed amount of leads won in ${monthLbl}.`}
        />
        <StatTile
          label="Pipeline value"
          value={money(m.pipelineValue)}
          info={`Total quoted value of open pipeline leads worked in ${monthLbl}.`}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
        <TargetMeter
          label="Company monthly target"
          done={companyClosed}
          target={companyTarget}
          info={`Team leads won in ${monthLbl} vs the company monthly target.`}
        />
        <div className="lg:col-span-2">
          <StatusBars byStatus={m.byStatus} total={m.totalLeads} />
        </div>
      </div>

      {/* Per-DSC breakdown */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold text-slate-600">DSC</th>
              <th className="px-4 py-2 font-semibold text-slate-600">
                Total leads
              </th>
              <th className="px-4 py-2 font-semibold text-slate-600">
                Closed ({monthLbl})
              </th>
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
                  {metrics.totalLeads}
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

      <EarningsCard
        title={`BDM · earnings · ${monthLbl}`}
        e={bdmEarnings}
        monthLbl={monthLbl}
      />
    </div>
  );
}

// Role-aware, collapsible analytics section. `variant` is "dsc" (own) or "team"
// (BDM/Admin). A month filter scopes the figures; `collapsed`/`onToggle` hide it.
export default function AnalyticsPanel({
  variant,
  dscName,
  self = false,
  data,
  collapsed,
  onToggle,
  month,
  months,
  onMonthChange,
}) {
  const monthLbl = monthLabel(month);
  const heading =
    variant === "team"
      ? "Team performance"
      : self
        ? "My performance"
        : `${dscName}'s performance`;
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 px-6 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          <span
            className={`text-slate-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
          >
            ▸
          </span>
          <h3 className="text-sm font-semibold text-slate-700">{heading}</h3>
        </button>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hidden sm:inline">Month</span>
            <select
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {months.map((ym) => (
                <option key={ym} value={ym}>
                  {monthLabel(ym)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onToggle}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="px-6 pb-4">
          {variant === "dsc" ? (
            <DscView name={dscName} monthLbl={monthLbl} data={data} />
          ) : (
            <TeamView monthLbl={monthLbl} data={data} />
          )}
        </div>
      ) : null}
    </section>
  );
}
