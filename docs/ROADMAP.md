# Roadmap

The build sequence from the [Build Brief §3](./BUILD_BRIEF.md). Do the steps in
order — each screen should work and be reviewed before starting the next. Each
step maps to one (or a few) focused PRs.

Legend: ✅ done · 🔜 next · ⬜ not started

---

### ✅ 1. Lead Table

The core screen listing all leads.

- Sortable columns, search, status + DSC filters, colour-coded badges.
- Row click → detail slide-over with the full field set + inline status changer.
- Overdue follow-up highlighting; DSC-vs-BDM scoping preview.
- **Files:** `src/app/leads/`, `src/components/leads/`, `src/data/`, `src/lib/`.

### 🔜 2. Statuses — Pipeline / Kanban

A board view of the pipeline; drag or select to change a lead's status.

- Reuse `getLeads()` + `statuses.js` (`STATUS_ORDER` gives column order).
- New: `src/app/pipeline/page.jsx`, `src/components/pipeline/*`.
- Wire status changes through `updateLead()` (already exists).

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

- Depends on **auth** (`GET /api/me`) so scoping moves server-side.
- Remove the mock "Viewing as" switcher once auth drives the role.

---

## Backend enablement (parallel track for the Laravel team)

Independent of the screens above; unblocks going live.

1. Build the endpoints in [API_CONTRACT.md](./API_CONTRACT.md).
2. Add auth (Sanctum or tokens); expose `GET /api/me`.
3. Set `NEXT_PUBLIC_API_BASE_URL` → the data layer flips off mock data.
4. Delete `src/data/*` and the mock branches in the `*Api.js` files.
5. Move role scoping server-side; drop the "Viewing as" preview.

## Known TODOs in code

Grep for `TODO(backend)` and `TODO:` — each marks a spot that needs a real
decision or the API. Notable ones:

- `leadsApi.js` — auth headers/credentials on requests.
- `LeadDetailPanel.jsx` — edit/reassign actions + failure toasts on save.
- `page.jsx` (leads) — revert optimistic status change if the PATCH fails.
