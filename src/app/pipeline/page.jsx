"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import RoleSwitcher from "@/components/leads/RoleSwitcher";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import PipelineToolbar from "@/components/pipeline/PipelineToolbar";
import LeadDetailSidebar from "@/components/leads/LeadDetailSidebar";
import { getLeads, updateLead } from "@/lib/leadsApi";
import {
  USER_BY_ID,
  PRIORITIES,
  INDUSTRIES,
  LEAD_SOURCES,
} from "@/data/mockLeads";
import { useColumnConfig } from "@/lib/columnConfig";
import { useActiveDscs, useUsers } from "@/lib/usersConfig";
import { groupsOf } from "@/components/leads/columns";
import { matchesDateWindow } from "@/lib/dateFilters";

const EMPTY_FILTERS = {
  priority: [],
  industry: [],
  city: [],
  leadSource: [],
  assignedDscId: [],
};
const SEARCH_KEYS = [
  "company",
  "contactPerson",
  "email",
  "phone",
  "leadId",
  "city",
];

// Pipeline / Kanban board (Build Brief §3 step 2). Drag a lead card between
// status columns — or use the card's status select — to change its status.
// Role-aware like the Lead Table: a DSC sees only their own leads.
export default function PipelinePage() {
  const dscs = useActiveDscs();
  const { users } = useUsers();

  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = users.find((u) => u.id === viewerId) || USER_BY_ID[viewerId];
  const isManager = viewer?.role === "bdm" || viewer?.role === "admin";

  // Keep the demo viewer valid if the Admin deactivates the current one.
  useEffect(() => {
    const active = users.filter((u) => u.status !== "deactivated");
    if (active.length && !active.some((u) => u.id === viewerId)) {
      setViewerId(active[0].id);
    }
  }, [users, viewerId]);

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

  // ---- Filters -------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [followUp, setFollowUp] = useState(""); // overdue | today | week
  const [activity, setActivity] = useState(""); // last7 | last30 (Last Contact)
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  function handleFilterChange(key, values) {
    setFilters((f) => ({ ...f, [key]: values }));
  }
  function clearAll() {
    setSearch("");
    setFollowUp("");
    setActivity("");
    setFilters(EMPTY_FILTERS);
  }

  // Reset filters when switching role/viewer.
  useEffect(() => {
    setSearch("");
    setFollowUp("");
    setActivity("");
    setFilters(EMPTY_FILTERS);
  }, [viewerId]);

  const cityOptions = useMemo(
    () => Array.from(new Set(scoped.map((l) => l.city).filter(Boolean))).sort(),
    [scoped]
  );
  const filterOptions = {
    priority: PRIORITIES,
    industry: INDUSTRIES,
    city: cityOptions,
    leadSource: LEAD_SOURCES,
    assignedDscId: [
      { value: "", label: "Unassigned" },
      ...dscs.map((d) => ({ value: d.id, label: d.name })),
    ],
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((lead) => {
      for (const key of Object.keys(EMPTY_FILTERS)) {
        const sel = filters[key];
        if (sel.length > 0 && !sel.includes(lead[key])) return false;
      }
      if (followUp && !matchesDateWindow(lead.nextFollowUpDate, followUp))
        return false;
      if (activity && !matchesDateWindow(lead.lastContactDate, activity))
        return false;
      if (q) {
        const hay = SEARCH_KEYS.map((k) => lead[k])
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scoped, search, followUp, activity, filters]);

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

      {!loading ? (
        <PipelineToolbar
          scoped={scoped}
          count={filtered.length}
          total={scoped.length}
          search={search}
          onSearch={setSearch}
          followUp={followUp}
          onFollowUp={setFollowUp}
          activity={activity}
          onActivity={setActivity}
          filters={filters}
          onFilterChange={handleFilterChange}
          options={filterOptions}
          showDscFilter={isManager}
          onClearAll={clearAll}
        />
      ) : null}

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading pipeline…
          </div>
        ) : (
          <PipelineBoard
            leads={filtered}
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
