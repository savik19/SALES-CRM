// ---------------------------------------------------------------------------
// Analytics & earnings — pure computations over leads + the compensation config.
// No React. Everything policy-related (targets, salary, commission %, training,
// deductions) is read from the config so a change by the Admin flows straight
// through to what the DSC/BDM analytics show.
// ---------------------------------------------------------------------------

import { LEAD_STATUSES } from "@/data/mockLeads";
import { isOnOrBefore } from "@/lib/format";

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

// Core lead metrics for any set of leads (a DSC's own, or the whole team).
export function leadMetrics(leads) {
  const byStatus = {};
  LEAD_STATUSES.forEach((s) => (byStatus[s] = 0));
  let won = 0;
  let wonValue = 0;
  let pipelineValue = 0;
  let followUpsDue = 0;

  for (const l of leads) {
    byStatus[l.leadStatus] = (byStatus[l.leadStatus] || 0) + 1;
    if (isWon(l.leadStatus)) {
      won += 1;
      wonValue += Number(l.closedAmount) || 0;
    } else if (isActive(l.leadStatus)) {
      pipelineValue += Number(l.quotedAmount) || 0;
    }
    if (l.nextFollowUpDate && isOnOrBefore(l.nextFollowUpDate))
      followUpsDue += 1;
  }

  const total = leads.length;
  return {
    total,
    byStatus,
    won,
    wonValue,
    pipelineValue,
    followUpsDue,
    conversion: total ? (won / total) * 100 : 0,
  };
}

// The effective compensation package for one person = the role default merged
// with that individual's override (only the keys present in the override win).
// This is the single place that decides "what is this person actually paid on".
export function resolvePersonComp(config, role, userId) {
  const base = role === "bdm" ? config.bdm : config.dsc;
  const override = (config.overrides && config.overrides[userId]) || {};
  return { ...base, ...override };
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

// Full analytics for a single DSC (their own leads only), using their effective
// package (so a per-person override changes only their numbers).
export function dscAnalytics(dsc, allLeads, config) {
  const own = allLeads.filter((l) => l.assignedDscId === dsc.id);
  const metrics = leadMetrics(own);
  const comp = resolvePersonComp(config, "dsc", dsc.id);
  const inTraining = (dsc.joinedMonthsAgo ?? 99) < comp.trainingMonths;
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

// Full team analytics for the BDM / Admin (whole company). `manager` is the
// viewer (a BDM or Admin) so the BDM earnings card uses their effective package.
export function teamAnalytics(allLeads, dscs, config, manager) {
  const companyMetrics = leadMetrics(allLeads);
  const perDsc = dscs.map((d) => dscAnalytics(d, allLeads, config));
  const bdmComp = resolvePersonComp(config, "bdm", manager?.id);
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
