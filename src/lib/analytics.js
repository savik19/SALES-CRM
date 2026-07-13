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

// Monthly earnings for one person. The 75% Fixed part is always paid; the 25%
// Performance Pay AND the commission are paid ONLY when the monthly target is
// met (offer-letter rule). During training a DSC gets a flat training salary.
export function personEarnings({
  role,
  inTraining,
  closedCount,
  target,
  salesValue,
  config,
}) {
  if (role === "dsc" && inTraining) {
    const gross = config.dsc.trainingSalaryMonthly;
    const deductions = (gross * config.deductionPct) / 100;
    return {
      inTraining: true,
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

  const c = role === "bdm" ? config.bdm : config.dsc;
  const totalSalary = role === "bdm" ? c.salaryMonthly : c.baseSalaryMonthly;
  const fixed = (totalSalary * c.fixedPortionPct) / 100;
  const performancePay = totalSalary - fixed;
  const commission = ((Number(salesValue) || 0) * c.commissionPct) / 100;
  const targetMet = closedCount >= target;
  const gross = fixed + (targetMet ? performancePay + commission : 0);
  const deductions = (gross * config.deductionPct) / 100;
  return {
    inTraining: false,
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

// Full analytics for a single DSC (their own leads only).
export function dscAnalytics(dsc, allLeads, config) {
  const own = allLeads.filter((l) => l.assignedDscId === dsc.id);
  const metrics = leadMetrics(own);
  const inTraining = (dsc.joinedMonthsAgo ?? 99) < config.dsc.trainingMonths;
  const earnings = personEarnings({
    role: "dsc",
    inTraining,
    closedCount: metrics.won,
    target: config.dsc.monthlyLeadTarget,
    salesValue: metrics.wonValue,
    config,
  });
  return { dsc, metrics, earnings };
}

// Full team analytics for the BDM / Admin (whole company).
export function teamAnalytics(allLeads, dscs, config) {
  const companyMetrics = leadMetrics(allLeads);
  const perDsc = dscs.map((d) => dscAnalytics(d, allLeads, config));
  const bdmEarnings = personEarnings({
    role: "bdm",
    inTraining: false,
    closedCount: companyMetrics.won,
    target: config.bdm.monthlyLeadTarget,
    salesValue: companyMetrics.wonValue,
    config,
  });
  return {
    companyMetrics,
    perDsc,
    bdmEarnings,
    companyTarget: config.bdm.monthlyLeadTarget,
    companyClosed: companyMetrics.won,
  };
}
