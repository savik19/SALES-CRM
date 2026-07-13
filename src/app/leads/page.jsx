"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import LeadFilters from "@/components/leads/LeadFilters";
import LeadTable from "@/components/leads/LeadTable";
import LeadDetailPanel from "@/components/leads/LeadDetailPanel";
import { getLeads, updateLead } from "@/lib/leadsApi";
import { TEAM, USER_BY_ID, dscName } from "@/data/users";
import { STATUS_ORDER } from "@/data/statuses";

// Fields whose values are dates/enums and need custom comparison.
function compareLeads(a, b, key, dir) {
  const factor = dir === "asc" ? 1 : -1;
  let av = a[key];
  let bv = b[key];

  if (key === "status") {
    // Sort by pipeline order, not alphabetically.
    av = STATUS_ORDER.indexOf(a.status);
    bv = STATUS_ORDER.indexOf(b.status);
    return (av - bv) * factor;
  }
  if (key === "assignedDscId") {
    av = dscName(a.assignedDscId);
    bv = dscName(b.assignedDscId);
  }
  if (key === "nextFollowUp") {
    // Empty dates sort to the bottom regardless of direction.
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return (av < bv ? -1 : av > bv ? 1 : 0) * factor;
  }

  av = (av ?? "").toString().toLowerCase();
  bv = (bv ?? "").toString().toLowerCase();
  if (av < bv) return -1 * factor;
  if (av > bv) return 1 * factor;
  return 0;
}

export default function LeadsPage() {
  // ---- "Viewing as" (previews role scoping from Brief §4) --------------------
  // Default to the BDM so the whole team's leads show. Switch to a DSC to see
  // the "only my leads" experience. The real app derives this from auth.
  const [viewerId, setViewerId] = useState("u-prakhar");
  const viewer = USER_BY_ID[viewerId];

  // ---- Data -----------------------------------------------------------------
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLeads({ currentUser: viewer }).then((rows) => {
      if (active) {
        setAllLeads(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [viewer]);

  // ---- Table controls -------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dscFilter, setDscFilter] = useState("all");
  const [sortBy, setSortBy] = useState("company");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(null);

  function handleSort(key) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  // ---- Derived: search + filter + sort --------------------------------------
  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = allLeads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (dscFilter !== "all" && lead.assignedDscId !== dscFilter) return false;
      if (!q) return true;
      const haystack = [
        lead.company,
        lead.industry,
        lead.contactPerson,
        lead.location,
        lead.email,
        lead.phone,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    rows = [...rows].sort((a, b) => compareLeads(a, b, sortBy, sortDir));
    return rows;
  }, [allLeads, search, statusFilter, dscFilter, sortBy, sortDir]);

  // ---- Status change (optimistic; persists once API is wired) ---------------
  async function handleChangeStatus(id, nextStatus) {
    setAllLeads((rows) =>
      rows.map((l) => (l.id === id ? { ...l, status: nextStatus } : l))
    );
    setSelected((s) => (s && s.id === id ? { ...s, status: nextStatus } : s));
    // Fire the (mock) persistence call. Real API makes this durable.
    try {
      await updateLead(id, { status: nextStatus });
    } catch (err) {
      // TODO(backend): surface a toast + revert on failure.
      console.error(err);
    }
  }

  const isDscViewer = viewer?.role === "dsc";

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Lead Table"
        subtitle={isDscViewer ? "Your leads only" : "All leads across the team"}
        right={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden sm:inline">Viewing as</span>
            <select
              value={viewerId}
              onChange={(e) => {
                setViewerId(e.target.value);
                setDscFilter("all");
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {TEAM.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.role.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <LeadFilters
        search={search}
        onSearch={setSearch}
        status={statusFilter}
        onStatus={setStatusFilter}
        dsc={dscFilter}
        onDsc={setDscFilter}
        showDscFilter={!isDscViewer}
        count={visibleLeads.length}
        total={allLeads.length}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-6 py-20 text-center text-sm text-slate-500">
            Loading leads…
          </div>
        ) : (
          <LeadTable
            leads={visibleLeads}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={setSelected}
            selectedId={selected?.id}
          />
        )}
      </div>

      <LeadDetailPanel
        lead={selected}
        onClose={() => setSelected(null)}
        onChangeStatus={handleChangeStatus}
      />
    </div>
  );
}
