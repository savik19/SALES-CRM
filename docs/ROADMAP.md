# Roadmap

The build sequence from the [Build Brief §3](./BUILD_BRIEF.md). Do the steps in
order — each screen should work and be reviewed before starting the next. Each
step maps to one (or a few) focused PRs.

Legend: ✅ done · 🔜 next · ⬜ not started

---

### ✅ 1. Lead Table

The core screen listing all leads (full 26-column schema) with import + roles.

- 26 columns in fixed schema order; 10 shown by default + a column-picker;
  resizable columns; cells truncate with tooltip + click-to-expand; Services as
  chips (+N popover); row expand arrow → inline editor for every field.
- Every column sortable (text/number/date/pipeline-order/etc.); global search;
  six multi-select filters (DSC incl. "Unassigned") + follow-up date presets;
  removable chips + clear-all.
- **Excel import (BDM):** upload `.xlsx` → header validation → preview + dedupe →
  commit as New/unassigned → summary. `src/lib/leadImport.js` + `read-excel-file`.
- **Roles (§4):** BDM sees all + imports + bulk-assigns + edits; DSC sees only
  their own leads and can't assign/import. Demo role switcher.
- **Files:** `src/app/leads/`, `src/components/leads/`, `src/lib/leadImport.js`,
  `src/data/mockLeads.js`.

### ✅ 2. Statuses — Pipeline / Kanban

A board view of the pipeline (`/pipeline`): one column per status (pipeline
order), lead cards showing company / priority / DSC / value / next follow-up.
Change a lead's status by **dragging** its card between columns **or** the card's
status select. Role-aware (DSC sees only their own); clicking a card opens the
shared detail sidebar. Status changes go through `updateLead()`.

- **Files:** `src/app/pipeline/page.jsx`, `src/components/pipeline/PipelineBoard.jsx`.

### ✅ Admin settings (User Management · Column Mapping · Compensation)

Admin-only screens that configure the CRM (available from the sidebar):

- **User Management** (`/settings/users`) — add BDMs and DSCs with full details
  (name, role, email, mobile, address, city, salary, join date); headcount cards
  (total/active DSCs & BDMs, invited, deactivated); deactivate leavers (and
  reactivate); invite new joiners by email (mock — flips to _Invited_; the real
  email + set-password flow is a backend TODO). The managed team drives the role
  switcher, DSC assignment, filters and per-DSC analytics live (via a registry
  bridge in `mockLeads.js` + `src/lib/usersConfig.jsx`). API: `/api/users*`.
- **Column Mapping** (`/settings/columns`) — edit column labels/aliases, toggle
  which appear in the import sheet, add/remove columns.
- **Compensation** (`/settings/compensation`) — salaries, targets, commission %,
  training length/amount and deductions; the DSC/BDM analytics read these live.

### ⬜ 3. Analytics

Charts/summaries over leads — by status, industry, location, value.

- New: `src/app/analytics/page.jsx`, `src/components/analytics/*`.
- Suggested endpoint: `GET /api/analytics/leads?groupBy=…` (see API_CONTRACT).
- Pick a lightweight chart lib (e.g. Recharts) — document the choice.

### ⬜ 4. KPIs (daily activity per DSC — Brief §7)

Daily entry form + roll-ups (calls, connects, LinkedIn outreach).

- New: `src/app/kpis/page.jsx`, `src/lib/kpisApi.js`, `KpiEntry` type (exists).
- Endpoints: `GET /api/kpis`, `POST /api/kpis`.

### ⬜ 5. Role-based views & dashboards

DSC dashboard (my leads, my follow-ups, my targets) vs BDM dashboard (team
analytics, per-DSC KPIs, targets vs achieved, reassignment).

- Depends on **auth** (`GET /api/me`) so lead scoping happens server-side
  (DSC sees own leads; BDM sees all).

---

## Backend enablement (parallel track for the Laravel team)

Independent of the screens above; unblocks going live.

1. Build the endpoints in [API_CONTRACT.md](./API_CONTRACT.md).
2. Add auth (Sanctum or tokens); expose `GET /api/me`.
3. Set `NEXT_PUBLIC_API_BASE_URL` → the data layer flips off mock data.
4. Delete `src/data/*` and the mock branches in the `*Api.js` files.
5. Move lead scoping server-side (DSC vs BDM) via the authenticated user.

## Known TODOs in code

Grep for `TODO(backend)` and `TODO:` — each marks a spot that needs a real
decision or the API. Notable ones:

- `leadsApi.js` — auth headers/credentials on requests; `updateLead` PATCH is
  stubbed but not yet used by any screen.
- The Lead Table is read-only for now — edit/status-change/reassign UI comes
  with later roadmap steps.
