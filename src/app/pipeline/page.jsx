"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import LeadDetailSidebar from "@/components/leads/LeadDetailSidebar";
import { getLeads, updateLead } from "@/lib/leadsApi";
import { USER_BY_ID } from "@/data/mockLeads";
import { useColumnConfig } from "@/lib/columnConfig";
import { groupsOf } from "@/components/leads/columns";

// Pipeline / Kanban board (Build Brief §3 step 2). Drag a lead card between
// status columns — or use the card's status select — to change its status.
// Role-aware like the Lead Table: a DSC sees only their own leads.
export default function PipelinePage() {
  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = USER_BY_ID[viewerId];
  const isManager = viewer?.role === "bdm" || viewer?.role === "admin";

  const { columns } = useColumnConfig();
  const groups = useMemo(() => groupsOf(columns), [columns]);

  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLead, setDetailLead] = useState(null);

  useEffect(() => {
    let active = true;
    getLeads().then((rows) => {
      if (active) {
        setAllLeads(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const scoped = useMemo(
    () =>
      isManager
        ? allLeads
        : allLeads.filter((l) => l.assignedDscId === viewerId),
    [allLeads, isManager, viewerId]
  );

  function handleMove(leadId, status) {
    setAllLeads((rows) =>
      rows.map((l) => (l.leadId === leadId ? { ...l, leadStatus: status } : l))
    );
    setDetailLead((d) =>
      d && d.leadId === leadId ? { ...d, leadStatus: status } : d
    );
    updateLead(leadId, { leadStatus: status }).catch((e) => console.error(e));
  }

  function handleFieldChange(leadId, patch) {
    setAllLeads((rows) =>
      rows.map((l) => (l.leadId === leadId ? { ...l, ...patch } : l))
    );
    setDetailLead((d) => (d && d.leadId === leadId ? { ...d, ...patch } : d));
    updateLead(leadId, patch).catch((e) => console.error(e));
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Pipeline"
        subtitle={
          isManager
            ? "Drag a lead between stages to update its status"
            : `${viewer?.name}'s pipeline`
        }
        right={<RoleSwitcher viewerId={viewerId} onChange={setViewerId} />}
      />

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading pipeline…
          </div>
        ) : (
          <PipelineBoard
            leads={scoped}
            onMove={handleMove}
            onOpen={setDetailLead}
          />
        )}
      </div>

      <LeadDetailSidebar
        lead={detailLead}
        role={viewer?.role}
        groups={groups}
        onChange={handleFieldChange}
        onClose={() => setDetailLead(null)}
      />
    </div>
  );
}
