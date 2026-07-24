"use client";

// ---------------------------------------------------------------------------
// useDeals — the shared client hook for working with DEALS (Lead → Deal model).
// Both the Pipeline board and the Lead Table's "Deals" view use it, so the deal
// rules live in ONE place: loading + enrichment, the role/ownership permissions,
// the STAGE EDITABILITY MATRIX (§3.3), and the approval flow (request / approve /
// reject / deliver / reverse).
//
// A deal has two independent fields: `stage` and `approval`. Who may edit the
// stage, and to which values, depends on `approval`:
//
//   approval        edit stage by        selectable stages
//   not_requested   DSC(own)/BDM/Admin   open, proposal_sent, negotiation, cancelled
//   rejected        DSC(own)/BDM/Admin   open, proposal_sent, negotiation, cancelled
//   pending         nobody (locked)      — (owner may withdraw the request)
//   approved        Admin only           project_delivered, cancelled (via deliver/reverse)
//   reversed        nobody (terminal)    —
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDeals,
  updateDeal,
  requestApproval,
  withdrawApproval,
  approveDeal,
  rejectDeal,
  deliverDeal,
  reverseDeal,
} from "@/lib/dealsApi";
import { getLeads } from "@/lib/leadsApi";
import { findOffering } from "@/lib/commission";
import { seedLedgerFromDeals } from "@/lib/commissionLedger";
import { can, isManager as isManagerRole, isAdmin } from "@/lib/permissions";
import {
  DEAL_STAGE,
  DEAL_APPROVAL,
  KANBAN_STAGES,
  isLiveStage,
} from "@/lib/statuses";

// The stages a user can pick for a pre-approval deal.
const EDITABLE_STAGES = KANBAN_STAGES; // open, proposal_sent, negotiation, cancelled
const EDITABLE_APPROVALS = new Set([
  DEAL_APPROVAL.NOT_REQUESTED,
  DEAL_APPROVAL.REJECTED,
]);

export function useDeals({ user, focusIsDsc, config }) {
  const viewerId = user?.id;
  const isManager = isManagerRole(user);

  const [rawDeals, setRawDeals] = useState([]);
  const [leadsById, setLeadsById] = useState({});
  const [loading, setLoading] = useState(true);

  // Detail slide-over + approval-request modal state.
  const [detailDeal, setDetailDeal] = useState(null);
  const [winDeal, setWinDeal] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getDeals(), getLeads()]).then(([deals, leads]) => {
      if (!active) return;
      const map = {};
      for (const l of leads) map[l.leadId] = l;
      setLeadsById(map);
      setRawDeals(deals);
      // Seed the commission ledger to match the seed deals' approval state.
      if (config) seedLedgerFromDeals(deals, config);
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(() => getDeals().then(setRawDeals), []);

  // Enrich each deal with company name + offering name/kind.
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

  // ---- Ownership check (does this viewer own/manage this deal?) ------------
  const owns = useCallback(
    (deal) => {
      if (!deal) return false;
      if (isAdmin(user)) return true;
      if (isManager) return !focusIsDsc; // BDM acts on the team unless focused on one DSC
      return deal.ownerId === viewerId || deal.ownerId === "";
    },
    [user, isManager, focusIsDsc, viewerId]
  );

  // ---- Stage editability matrix (§3.3) ------------------------------------
  const canEditStage = useCallback(
    (deal) => {
      if (!deal) return false;
      if (deal.approval === DEAL_APPROVAL.PENDING) return false; // locked
      if (deal.approval === DEAL_APPROVAL.REVERSED) return false; // terminal
      if (deal.approval === DEAL_APPROVAL.APPROVED) return isAdmin(user); // Admin only
      // not_requested / rejected → owner (DSC own / BDM team / Admin)
      return owns(deal) && can(user, "edit_deal_stage", deal);
    },
    [user, owns]
  );

  // The stages this viewer may select for this deal.
  const selectableStages = useCallback(
    (deal) => {
      if (!deal) return [];
      if (deal.approval === DEAL_APPROVAL.APPROVED && isAdmin(user)) {
        return [DEAL_STAGE.PROJECT_DELIVERED, DEAL_STAGE.CANCELLED];
      }
      if (EDITABLE_APPROVALS.has(deal.approval) && canEditStage(deal)) {
        return EDITABLE_STAGES;
      }
      return [];
    },
    [user, canEditStage]
  );

  // Amounts editable only while the deal is pre-approval and the viewer owns it.
  const canEditAmounts = useCallback(
    (deal) =>
      !!deal &&
      EDITABLE_APPROVALS.has(deal.approval) &&
      owns(deal) &&
      can(user, "edit_deal_amounts", deal),
    [user, owns]
  );

  // ---- Eligibility to request approval (§3.4) -----------------------------
  // Returns { ok, reason } so the UI can disable + explain the specific gap.
  const approvalEligibility = useCallback(
    (deal) => {
      if (!deal) return { ok: false, reason: "No deal." };
      if (!(owns(deal) && can(user, "request_approval", deal)))
        return {
          ok: false,
          reason: "You can't request approval for this deal.",
        };
      if (deal.approval === DEAL_APPROVAL.PENDING)
        return { ok: false, reason: "Already awaiting Admin approval." };
      if (deal.approval === DEAL_APPROVAL.APPROVED)
        return { ok: false, reason: "This deal is already approved." };
      if (deal.approval === DEAL_APPROVAL.REVERSED)
        return { ok: false, reason: "This deal was reversed." };
      if (!isLiveStage(deal.stage))
        return { ok: false, reason: "Cancelled deals can't request approval." };
      if (!(Number(deal.finalAmount) > 0))
        return { ok: false, reason: "Set the finalized amount first." };
      if (!deal.ownerId) return { ok: false, reason: "Assign an owner first." };
      if (!deal.offeringId)
        return { ok: false, reason: "Pick an offering first." };
      return { ok: true, reason: "" };
    },
    [user, owns]
  );
  const canRequestApproval = useCallback(
    (deal) => approvalEligibility(deal).ok,
    [approvalEligibility]
  );

  const canWithdraw = useCallback(
    (deal) => deal?.approval === DEAL_APPROVAL.PENDING && owns(deal),
    [owns]
  );

  // ---- Local optimistic patch helper --------------------------------------
  const patchLocal = useCallback((dealId, patch) => {
    setRawDeals((rows) =>
      rows.map((d) => (d.dealId === dealId ? { ...d, ...patch } : d))
    );
    setDetailDeal((d) => (d && d.dealId === dealId ? { ...d, ...patch } : d));
  }, []);

  const actor = useMemo(() => ({ id: user?.id, role: user?.role }), [user]);

  // ---- Actions ------------------------------------------------------------
  // Move a deal's stage (pre-approval), if allowed. Returns false + a reason
  // when the target stage isn't selectable (the board shows a toast).
  const moveDeal = useCallback(
    (dealId, stage) => {
      const deal = rawDeals.find((d) => d.dealId === dealId);
      if (!deal) return { ok: false, reason: "No deal." };
      if (!selectableStages(deal).includes(stage)) {
        if (
          stage === DEAL_STAGE.PROJECT_STARTED ||
          stage === DEAL_STAGE.PROJECT_DELIVERED
        ) {
          return {
            ok: false,
            reason:
              "Project Started is set by Admin approval. Use Request Approval.",
          };
        }
        return { ok: false, reason: "You can't move this deal there." };
      }
      patchLocal(dealId, { stage });
      updateDeal(dealId, { stage }, { actor }).catch((e) => console.error(e));
      return { ok: true, reason: "" };
    },
    [rawDeals, selectableStages, patchLocal, actor]
  );

  // Edit a deal's amounts / offering (pre-approval only).
  const editDeal = useCallback(
    (dealId, patch) => {
      const deal = rawDeals.find((d) => d.dealId === dealId);
      if (!deal || !canEditAmounts(deal)) return;
      patchLocal(dealId, patch);
      updateDeal(dealId, patch, { actor }).catch((e) => console.error(e));
    },
    [rawDeals, canEditAmounts, patchLocal, actor]
  );

  // Open / close the approval-request modal.
  const openWinRequest = useCallback((deal) => setWinDeal({ ...deal }), []);
  const closeWinRequest = useCallback(() => setWinDeal(null), []);

  // Submit the approval request → deal goes pending until an Admin decides.
  const submitWinRequest = useCallback(
    (payload) => {
      const dealId = winDeal?.dealId;
      if (!dealId) return;
      patchLocal(dealId, {
        approval: DEAL_APPROVAL.PENDING,
        approvalRequest: payload,
        approvalReason: "",
        finalAmount: payload?.finalAmount ?? winDeal?.finalAmount,
      });
      requestApproval(dealId, { actor, payload })
        .then(() => reload())
        .catch((e) => console.error(e));
      setWinDeal(null);
    },
    [winDeal, patchLocal, reload, actor]
  );

  const withdrawRequest = useCallback(
    (dealId) => {
      patchLocal(dealId, {
        approval: DEAL_APPROVAL.NOT_REQUESTED,
        approvalRequest: null,
      });
      withdrawApproval(dealId, { actor })
        .then(() => reload())
        .catch((e) => console.error(e));
    },
    [patchLocal, reload, actor]
  );

  // ---- Admin approval actions (also used by the Approvals screen) ---------
  const approveDealAction = useCallback(
    (dealId) => {
      if (!isAdmin(user)) return;
      patchLocal(dealId, {
        approval: DEAL_APPROVAL.APPROVED,
        stage: DEAL_STAGE.PROJECT_STARTED,
      });
      approveDeal(dealId, { actor, config })
        .then(() => reload())
        .catch((e) => console.error(e));
    },
    [user, actor, config, patchLocal, reload]
  );

  const rejectDealAction = useCallback(
    (dealId, reason) => {
      if (!isAdmin(user)) return;
      patchLocal(dealId, {
        approval: DEAL_APPROVAL.REJECTED,
        approvalReason: reason,
      });
      rejectDeal(dealId, { actor, reason })
        .then(() => reload())
        .catch((e) => console.error(e));
    },
    [user, actor, patchLocal, reload]
  );

  const deliverDealAction = useCallback(
    (dealId) => {
      if (!isAdmin(user)) return;
      patchLocal(dealId, { stage: DEAL_STAGE.PROJECT_DELIVERED });
      deliverDeal(dealId, { actor, config })
        .then(() => reload())
        .catch((e) => console.error(e));
    },
    [user, actor, config, patchLocal, reload]
  );

  const reverseDealAction = useCallback(
    (dealId, reason) => {
      if (!isAdmin(user)) return;
      patchLocal(dealId, {
        approval: DEAL_APPROVAL.REVERSED,
        stage: DEAL_STAGE.CANCELLED,
        approvalReason: reason,
      });
      reverseDeal(dealId, { actor, config, reason })
        .then(() => reload())
        .catch((e) => console.error(e));
    },
    [user, actor, config, patchLocal, reload]
  );

  return {
    deals,
    leadsById,
    loading,
    reload,
    // permissions / matrix
    owns,
    canEditStage,
    selectableStages,
    canEditAmounts,
    canRequestApproval,
    approvalEligibility,
    canWithdraw,
    isAdmin: isAdmin(user),
    // detail
    detailDeal,
    setDetailDeal,
    // actions
    moveDeal,
    editDeal,
    // approval-request modal
    winDeal,
    openWinRequest,
    submitWinRequest,
    closeWinRequest,
    withdrawRequest,
    // admin approval actions
    approveDealAction,
    rejectDealAction,
    deliverDealAction,
    reverseDealAction,
  };
}
