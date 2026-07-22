"use client";

// ---------------------------------------------------------------------------
// useDeals — the shared client hook for working with DEALS (Lead → Deal model).
// Both the Pipeline board and the Lead Table's "Deals" view use it, so the deal
// rules live in ONE place: loading + enrichment, the role/ownership permissions,
// and the mutations (move stage, edit amounts, request approval to start the
// project). UI state that differs per screen (period, filters, board columns)
// stays on the page; this hook only owns the deal data + actions.
//
// The approval model: a DSC moves a deal freely up to "Won". Advancing INTO an
// approval-gated stage (Project Started onward) is the money event — it opens the
// approval request (which captures the finalized amount) instead of setting the
// status directly. On approval the deal is credited (target + commission).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDeals, updateDeal, requestDealWin } from "@/lib/dealsApi";
import { getLeads } from "@/lib/leadsApi";
import { findOffering } from "@/lib/commission";
import {
  APPROVAL_GATED_DEAL_STATUSES,
  CREDITED_DEAL_STATUSES,
} from "@/data/mockLeads";

export const DEAD_DEAL_STATUSES = new Set(["Lost", "Cancelled"]);

export function useDeals({ viewerId, isManager, focusIsDsc, config }) {
  const [rawDeals, setRawDeals] = useState([]);
  const [leadsById, setLeadsById] = useState({});
  const [loading, setLoading] = useState(true);

  // Detail slide-over + approval-request modal state.
  const [detailDeal, setDetailDeal] = useState(null);
  const [winDeal, setWinDeal] = useState(null);
  const [winToStatus, setWinToStatus] = useState("Project Started");

  useEffect(() => {
    let active = true;
    Promise.all([getDeals(), getLeads()]).then(([deals, leads]) => {
      if (!active) return;
      const map = {};
      for (const l of leads) map[l.leadId] = l;
      setLeadsById(map);
      setRawDeals(deals);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => getDeals().then(setRawDeals), []);

  // Enrich each deal with the company name (from its lead) + the offering
  // name/kind (from the catalog) — what the board, table, filters and detail need.
  const deals = useMemo(
    () =>
      rawDeals.map((d) => {
        const offering = findOffering(config, d.offeringId);
        return {
          ...d,
          company: leadsById[d.leadId]?.company || "—",
          offeringName: offering?.name || "Offering",
          offeringKind: offering?.kind || "",
        };
      }),
    [rawDeals, leadsById, config]
  );

  // ---- Permissions (same model as the Lead Table) -------------------------
  const canEditDeal = useCallback(
    (deal) => {
      if (!deal) return false;
      if (!isManager) return deal.ownerId === viewerId;
      if (focusIsDsc) return false;
      return deal.ownerId === "" || deal.ownerId === viewerId;
    },
    [isManager, focusIsDsc, viewerId]
  );

  // Amounts are editable while the deal isn't pending or already credited
  // (approved) — once approved the finalized price is locked.
  const canEditAmounts = useCallback(
    (deal) =>
      canEditDeal(deal) &&
      deal?.approvalStatus !== "pending" &&
      !CREDITED_DEAL_STATUSES.has(deal?.dealStatus),
    [canEditDeal]
  );

  // Eligible to request approval to start the project.
  const canRequestWin = useCallback(
    (deal) =>
      canEditDeal(deal) &&
      !APPROVAL_GATED_DEAL_STATUSES.has(deal?.dealStatus) &&
      !DEAD_DEAL_STATUSES.has(deal?.dealStatus) &&
      deal?.approvalStatus !== "pending",
    [canEditDeal]
  );

  // ---- Local optimistic patch helper --------------------------------------
  const patchLocal = useCallback((dealId, patch) => {
    setRawDeals((rows) =>
      rows.map((d) => (d.dealId === dealId ? { ...d, ...patch } : d))
    );
    setDetailDeal((d) => (d && d.dealId === dealId ? { ...d, ...patch } : d));
  }, []);

  // ---- Actions ------------------------------------------------------------
  // Move a deal's stage. Advancing into a gated stage opens the approval modal.
  const moveDeal = useCallback(
    (dealId, status) => {
      const deal = rawDeals.find((d) => d.dealId === dealId);
      if (!deal || !canEditDeal(deal) || deal.approvalStatus === "pending")
        return;
      const enteringGated =
        APPROVAL_GATED_DEAL_STATUSES.has(status) &&
        !APPROVAL_GATED_DEAL_STATUSES.has(deal.dealStatus);
      if (enteringGated) {
        setWinToStatus(status);
        setWinDeal({ ...deal });
        return;
      }
      patchLocal(dealId, { dealStatus: status });
      updateDeal(dealId, { dealStatus: status }).catch((e) => console.error(e));
    },
    [rawDeals, canEditDeal, patchLocal]
  );

  // Edit a deal's plain fields (pitched/finalized amounts…).
  const editDeal = useCallback(
    (dealId, patch) => {
      const deal = rawDeals.find((d) => d.dealId === dealId);
      if (!deal || !canEditDeal(deal) || deal.approvalStatus === "pending")
        return;
      patchLocal(dealId, patch);
      updateDeal(dealId, patch).catch((e) => console.error(e));
    },
    [rawDeals, canEditDeal, patchLocal]
  );

  // Open the approval request explicitly (e.g. from the detail button).
  const openWinRequest = useCallback((deal, toStatus = "Project Started") => {
    setWinToStatus(toStatus);
    setWinDeal({ ...deal });
  }, []);

  // Submit the approval request → deal goes pending until the Admin decides.
  const submitWinRequest = useCallback(
    (payload) => {
      const dealId = winDeal?.dealId;
      if (!dealId) return;
      const request = { ...payload, requestedStatus: winToStatus };
      patchLocal(dealId, {
        approvalStatus: "pending",
        approvalRequest: request,
        approvalReason: "",
      });
      requestDealWin(dealId, request)
        .then(() => reload())
        .catch((e) => console.error(e));
      setWinDeal(null);
    },
    [winDeal, winToStatus, patchLocal, reload]
  );

  const closeWinRequest = useCallback(() => setWinDeal(null), []);

  return {
    deals,
    leadsById,
    loading,
    reload,
    // permissions
    canEditDeal,
    canEditAmounts,
    canRequestWin,
    // detail
    detailDeal,
    setDetailDeal,
    // actions
    moveDeal,
    editDeal,
    // approval-request modal
    winDeal,
    winToStatus,
    openWinRequest,
    submitWinRequest,
    closeWinRequest,
  };
}
