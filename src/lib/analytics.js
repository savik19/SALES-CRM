// ---------------------------------------------------------------------------
// Analytics & earnings — pure computations over leads + the compensation config.
// No React. Everything policy-related (targets, salary, commission %, training,
// deductions) is read from the config so a change by the Admin flows straight
// through to what the DSC/BDM analytics show.
// ---------------------------------------------------------------------------

import { LEAD_STATUSES } from "@/data/mockLeads";
import { monthsSince, inMonth, isoInRange } from "@/lib/format";
import { dealCommission, commissionStatus } from "@/lib/commission";

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

// A lead counts as "contacted" once it has a last-contact date (it's been
// called/messaged at least once). Leads still at "New" with no contact are not.
export function isContacted(lead) {
  return !!lead.lastContactDate;
}

// Is a lead "active in the period [from, to]"? True when ANY of its activity
// dates fall in the range: assigned, last-contacted, next follow-up, or closed.
// Empty bounds (both "") = every lead. Used by the Pipeline board so a month (or
// a calendar range) shows the leads actually worked in that window, rather than
// every lead ever created. (String compare is safe for ISO dates.)
export function leadInPeriod(lead, from, to) {
  if (!from && !to) return true;
  return (
    isoInRange(lead.assignedDate, from, to) ||
    isoInRange(lead.lastContactDate, from, to) ||
    isoInRange(lead.nextFollowUpDate, from, to) ||
    isoInRange(lead.closedDate, from, to)
  );
}

// Metrics for a set of leads, scoped to a "YYYY-MM" month `ym`.
// ALL-TIME (any status, not month-scoped):
//   totalLeads   — every lead ever assigned
//   uncontacted  — leads never contacted yet (no last-contact date)
// FOR THE SELECTED MONTH (worked = last-contact OR assigned in the month):
//   newAssigned      — assignedDate in the month
//   contacted        — lastContactDate in the month
//   meetingScheduled — currently "Meeting Scheduled" and worked in the month
//   meetingDone      — currently "Meeting Done" and worked in the month
//   followUpsDue     — nextFollowUpDate in the month
//   won              — a won lead whose closedDate is in the month
//   wonValue         — Σ closedAmount of those won leads
//   pipelineValue    — Σ quotedAmount of OPEN leads worked in the month
// `byStatus` is the current all-time distribution (for the status bars).
export function monthMetrics(leads, ym) {
  const byStatus = {};
  LEAD_STATUSES.forEach((s) => (byStatus[s] = 0));
  let uncontacted = 0;
  let newAssigned = 0;
  let contacted = 0;
  let meetingScheduled = 0;
  let meetingDone = 0;
  let followUpsDue = 0;
  let won = 0;
  let wonValue = 0;
  let pipelineValue = 0;

  for (const l of leads) {
    byStatus[l.leadStatus] = (byStatus[l.leadStatus] || 0) + 1;
    if (!isContacted(l)) uncontacted += 1;

    const worked =
      inMonth(l.lastContactDate, ym) || inMonth(l.assignedDate, ym);
    if (inMonth(l.assignedDate, ym)) newAssigned += 1;
    if (inMonth(l.lastContactDate, ym)) contacted += 1;
    if (l.leadStatus === "Meeting Scheduled" && worked) meetingScheduled += 1;
    if (l.leadStatus === "Meeting Done" && worked) meetingDone += 1;
    if (inMonth(l.nextFollowUpDate, ym)) followUpsDue += 1;
    if (isWon(l.leadStatus) && inMonth(l.closedDate, ym)) {
      won += 1;
      wonValue += Number(l.closedAmount) || 0;
    } else if (isActive(l.leadStatus) && worked) {
      pipelineValue += Number(l.quotedAmount) || 0;
    }
  }

  return {
    totalLeads: leads.length,
    uncontacted,
    byStatus,
    newAssigned,
    contacted,
    meetingScheduled,
    meetingDone,
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
// and the global `deductionPct`. The Fixed part is always paid; the Performance
// Pay AND commission are paid ONLY when the monthly target is met (offer-letter
// rule). During training a DSC gets a flat training salary.
//
// Commission is CATALOG-based (not a flat %): the caller prices the person's won
// deals through the Services/Products catalog (lib/commission) and passes the
// month's total here, split into `finalized` (past the 3-month hold → payable)
// and `pending` (still in the hold window). Only the finalized part is paid out
// now; pending is shown so the person can see what's maturing.
export function personEarnings({
  role,
  inTraining,
  closedCount,
  commission = 0,
  pendingCommission = 0,
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
      fixed: gross,
      performancePay: 0,
      commission: 0,
      pendingCommission,
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
  const payableCommission = Number(commission) || 0; // finalized this month
  const targetMet = closedCount >= target;
  const gross = fixed + (targetMet ? performancePay + payableCommission : 0);
  const deductions = (gross * deductionPct) / 100;
  return {
    inTraining: false,
    fixedPortionPct: comp.fixedPortionPct,
    fixed,
    performancePay,
    commission: payableCommission,
    pendingCommission,
    targetMet,
    target,
    closedCount,
    gross,
    deductions,
    net: gross - deductions,
    atRisk: targetMet ? 0 : performancePay + payableCommission,
  };
}

// Price a set of won deals through the catalog for `role`, splitting the total
// into finalized (past the quarterly hold → payable now) and pending (still in
// the hold). Reversed/unapproved deals contribute 0. `now` is injectable.
export function commissionForDeals(deals, config, role, now = new Date()) {
  let finalized = 0;
  let pending = 0;
  for (const deal of deals) {
    const status = commissionStatus(deal, now);
    if (status !== "finalized" && status !== "pending") continue;
    const amount = dealCommission(deal, config, role);
    if (status === "finalized") finalized += amount;
    else pending += amount;
  }
  return { finalized, pending, total: finalized + pending };
}

// Full "own leads" analytics for one person for month `ym`, using their
// effective package. Works for a DSC (their own view) or a BDM ("My leads").
// Earnings are month-scoped: the target gate uses leads won in `ym`.
export function personAnalytics(person, allLeads, config, ym, role = "dsc") {
  const own = allLeads.filter((l) => l.assignedDscId === person.id);
  const metrics = monthMetrics(own, ym);
  const comp = resolvePersonComp(config, role, person);
  const inTraining =
    role === "dsc" &&
    (monthsSince(person.joiningDate) ?? 99) < comp.trainingMonths;
  // Commission is priced through the catalog over the deals this person won in
  // the month, split into finalized (payable) and pending (in the 3-month hold).
  const wonDeals = own.filter(
    (l) => isWon(l.leadStatus) && inMonth(l.closedDate, ym)
  );
  const comm = commissionForDeals(wonDeals, config, role);
  const earnings = personEarnings({
    role,
    inTraining,
    closedCount: metrics.won,
    commission: comm.finalized,
    pendingCommission: comm.pending,
    comp,
    deductionPct: config.deductionPct,
  });
  return {
    dsc: person, // alias so the team's per-DSC table can read `.dsc`
    person,
    metrics,
    earnings,
    comp,
    overridden: hasCompOverride(config, person.id),
  };
}

// A single DSC's analytics (their own leads only).
export function dscAnalytics(dsc, allLeads, config, ym) {
  return personAnalytics(dsc, allLeads, config, ym, "dsc");
}

// Full team analytics for the BDM / Admin (whole company) for month `ym`.
// `manager` is the viewer so the BDM earnings card uses their effective package.
export function teamAnalytics(allLeads, dscs, config, manager, ym) {
  const companyMetrics = monthMetrics(allLeads, ym);
  const perDsc = dscs.map((d) => dscAnalytics(d, allLeads, config, ym));
  const bdmComp = resolvePersonComp(config, "bdm", manager);
  // The BDM earns the manager override (BDM catalog rate) on EVERY team-won deal
  // in the month — priced through the catalog, same finalized/pending split.
  const companyWonDeals = allLeads.filter(
    (l) => isWon(l.leadStatus) && inMonth(l.closedDate, ym)
  );
  const bdmComm = commissionForDeals(companyWonDeals, config, "bdm");
  const bdmEarnings = personEarnings({
    role: "bdm",
    inTraining: false,
    closedCount: companyMetrics.won,
    commission: bdmComm.finalized,
    pendingCommission: bdmComm.pending,
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
