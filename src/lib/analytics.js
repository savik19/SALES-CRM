// ---------------------------------------------------------------------------
// Analytics & earnings — pure computations over leads + the compensation config.
// No React. Everything policy-related (targets, salary, commission %, training,
// deductions) is read from the config so a change by the Admin flows straight
// through to what the DSC/BDM analytics show.
// ---------------------------------------------------------------------------

import { LEAD_STATUSES } from "@/data/mockLeads";
import { monthsSince, inMonth } from "@/lib/format";

// A "closed"/won deal = Won or any post-sale status (not Cancelled, which is a
// won deal that fell apart, and not Lost / On Hold).
export const WON_STATUSES = new Set([
  "Won",
  "Project Started",
  "Project Delivered",
  "Closed",
]);
export function isWon(status) {
  return WON_STATUSES.has(status);
}
export function isDead(status) {
  return status === "Lost" || status === "Cancelled";
}
export function isActive(status) {
  return !isWon(status) && !isDead(status) && status !== "On Hold";
}

// Metrics for a set of leads, scoped to a "YYYY-MM" month `ym`.
// `totalLeads` is ALL-TIME (every lead ever assigned, any status). Everything
// else is for the selected month:
//   newAssigned  — assignedDate in the month
//   contacted    — lastContactDate in the month (they were worked/called)
//   followUpsDue — nextFollowUpDate in the month
//   won          — a won lead whose closedDate is in the month
//   wonValue     — Σ closedAmount of those won leads
//   pipelineValue— Σ quotedAmount of OPEN leads worked (contacted/assigned) in
//                  the month (proposals sent / quotes made)
// `byStatus` is the current all-time distribution (for the status bars).
export function monthMetrics(leads, ym) {
  const byStatus = {};
  LEAD_STATUSES.forEach((s) => (byStatus[s] = 0));
  let newAssigned = 0;
  let contacted = 0;
  let followUpsDue = 0;
  let won = 0;
  let wonValue = 0;
  let pipelineValue = 0;

  for (const l of leads) {
    byStatus[l.leadStatus] = (byStatus[l.leadStatus] || 0) + 1;
    if (inMonth(l.assignedDate, ym)) newAssigned += 1;
    if (inMonth(l.lastContactDate, ym)) contacted += 1;
    if (inMonth(l.nextFollowUpDate, ym)) followUpsDue += 1;
    if (isWon(l.leadStatus) && inMonth(l.closedDate, ym)) {
      won += 1;
      wonValue += Number(l.closedAmount) || 0;
    } else if (
      isActive(l.leadStatus) &&
      (inMonth(l.lastContactDate, ym) || inMonth(l.assignedDate, ym))
    ) {
      pipelineValue += Number(l.quotedAmount) || 0;
    }
  }

  return {
    totalLeads: leads.length,
    byStatus,
    newAssigned,
    contacted,
    followUpsDue,
    won,
    wonValue,
    pipelineValue,
  };
}

// The effective compensation package for one person. Resolution order (later
// wins): role default → the person's own monthly salary (from User Management,
// used as their post-training base salary) → per-person compensation override.
// This is the single place that decides "what is this person actually paid on".
export function resolvePersonComp(config, role, user) {
  const base = role === "bdm" ? config.bdm : config.dsc;
  const salaryKey = role === "bdm" ? "salaryMonthly" : "baseSalaryMonthly";
  const fromUser =
    user && user.salaryMonthly != null
      ? { [salaryKey]: user.salaryMonthly }
      : {};
  const override = (config.overrides && config.overrides[user?.id]) || {};
  return { ...base, ...fromUser, ...override };
}

// True if this person's override differs from the role default in any field.
export function hasCompOverride(config, userId) {
  const o = config.overrides && config.overrides[userId];
  return !!o && Object.keys(o).length > 0;
}

// Monthly earnings for one person, computed from their EFFECTIVE package `comp`
// (already resolved via resolvePersonComp) and the global `deductionPct`. The
// Fixed part is always paid; the Performance Pay AND the commission are paid
// ONLY when the monthly target is met (offer-letter rule). During training a DSC
// gets a flat training salary.
export function personEarnings({
  role,
  inTraining,
  closedCount,
  salesValue,
  comp,
  deductionPct,
}) {
  const target = comp.monthlyLeadTarget;

  if (role === "dsc" && inTraining) {
    const gross = comp.trainingSalaryMonthly;
    const deductions = (gross * deductionPct) / 100;
    return {
      inTraining: true,
      fixedPortionPct: comp.fixedPortionPct,
      commissionPct: comp.commissionPct,
      fixed: gross,
      performancePay: 0,
      commission: 0,
      targetMet: false,
      target,
      closedCount,
      gross,
      deductions,
      net: gross - deductions,
      atRisk: 0,
    };
  }

  const totalSalary =
    role === "bdm" ? comp.salaryMonthly : comp.baseSalaryMonthly;
  const fixed = (totalSalary * comp.fixedPortionPct) / 100;
  const performancePay = totalSalary - fixed;
  const commission = ((Number(salesValue) || 0) * comp.commissionPct) / 100;
  const targetMet = closedCount >= target;
  const gross = fixed + (targetMet ? performancePay + commission : 0);
  const deductions = (gross * deductionPct) / 100;
  return {
    inTraining: false,
    fixedPortionPct: comp.fixedPortionPct,
    commissionPct: comp.commissionPct,
    fixed,
    performancePay,
    commission,
    targetMet,
    target,
    closedCount,
    gross,
    deductions,
    net: gross - deductions,
    atRisk: targetMet ? 0 : performancePay + commission,
  };
}

// Full analytics for a single DSC (their own leads only) for month `ym`, using
// their effective package (so a per-person override changes only their numbers).
// Earnings are month-scoped: the target gate uses leads won in `ym`.
export function dscAnalytics(dsc, allLeads, config, ym) {
  const own = allLeads.filter((l) => l.assignedDscId === dsc.id);
  const metrics = monthMetrics(own, ym);
  const comp = resolvePersonComp(config, "dsc", dsc);
  const tenureMonths = monthsSince(dsc.joiningDate);
  const inTraining =
    tenureMonths !== null && tenureMonths < comp.trainingMonths;
  const earnings = personEarnings({
    role: "dsc",
    inTraining,
    closedCount: metrics.won,
    salesValue: metrics.wonValue,
    comp,
    deductionPct: config.deductionPct,
  });
  return {
    dsc,
    metrics,
    earnings,
    comp,
    overridden: hasCompOverride(config, dsc.id),
  };
}

// Full team analytics for the BDM / Admin (whole company) for month `ym`.
// `manager` is the viewer so the BDM earnings card uses their effective package.
export function teamAnalytics(allLeads, dscs, config, manager, ym) {
  const companyMetrics = monthMetrics(allLeads, ym);
  const perDsc = dscs.map((d) => dscAnalytics(d, allLeads, config, ym));
  const bdmComp = resolvePersonComp(config, "bdm", manager);
  const bdmEarnings = personEarnings({
    role: "bdm",
    inTraining: false,
    closedCount: companyMetrics.won,
    salesValue: companyMetrics.wonValue,
    comp: bdmComp,
    deductionPct: config.deductionPct,
  });
  return {
    companyMetrics,
    perDsc,
    bdmEarnings,
    companyTarget: bdmComp.monthlyLeadTarget,
    companyClosed: companyMetrics.won,
  };
}
