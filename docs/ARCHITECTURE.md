# Architecture

How this frontend is organised and how to extend it. Read this before adding a
screen — following the existing pattern keeps the codebase consistent.

---

## Stack

- **Next.js (App Router)** + **React 18** — function components, portable to an
  Inertia/Laravel setup later.
- **Tailwind CSS** — the only styling tool. Brand blue `#1060E0` is the Tailwind
  `brand` colour; font is IBM Plex Sans (Arial fallback).
- **JavaScript + JSX** with **JSDoc typedefs** for the data contract (no TS build
  step, but you still get editor autocomplete — see `src/lib/types.js`).
- **ESLint** (`next/core-web-vitals`) + **Prettier** for consistent code.

## The one rule that keeps everything decoupled

```
  UI components  ──►  src/lib/{leadsApi,dealsApi}.js  ──►  (mock data | Laravel API)
   (never import mock data directly)                     one swap point
```

Components receive data as props and call the **data layer** (`src/lib/*Api.js`).
They never import from `src/data/`. This is why the backend can be wired in one
place without touching the UI. See [API_CONTRACT.md](./API_CONTRACT.md).

**Domain: Lead → Deal.** A **Lead** is a prospect; a **Deal** is the unit of sale
(one deal = one offering). A lead holds many deals over time. Money, stage,
approval, commission and target live on the **deal**; the lead carries the funnel
status and a non-binding interest list.

**Status model (single source of truth: `src/lib/statuses.js`).**

- **Lead status — 10 values.** Seven are manual (`new`, `attempted`, `contacted`,
  `details_shared`, `interested`, `meeting_scheduled`, `meeting_done`). Two are
  **DERIVED** from the lead's deals and never user-settable — `in_discussion`
  (has a live deal) and `won` (has an approved deal; a one-way door). `lost` is
  manual but **gated**: only settable when the lead has zero approved deals.
  Derivation is the pure `deriveLeadStatus(lead, deals)` in `src/lib/leadStatus.js`.
  Because a lead can hold N deals, no single lead status can represent
  transaction progress — Proposal Sent / Negotiation live on the **deal**.
- **Deal has two INDEPENDENT fields.** `stage` — `open`, `proposal_sent`,
  `negotiation`, `project_started` (system, on approval), `project_delivered`
  (Admin), `cancelled`. `approval` — `not_requested`, `pending`, `approved`,
  `rejected`, `reversed`. The stage-editability matrix + approval flow live in
  `src/lib/useDeals.jsx`; the data-layer guards are in `src/lib/dealsApi.js`.

Advancing a deal to **Project Started** is the money event: the owner requests
approval (finalized amount required), the Admin approves (stage → project_started,
a commission **accrual** ledger entry), then delivers (release) or reverses
(negative entry). The Lead Table has a **Leads | Deals** toggle, the Pipeline is
the deals Kanban (4 drag stages + Started/Delivered read-only), and Approvals
groups pending deals under their lead with a second Approved tab.

## Folder map

```
src/
  app/                     # Next.js App Router — one folder per route
    layout.jsx             #   app shell (sidebar + main); global font/metadata
    page.jsx               #   "/"  → redirects to /leads
    leads/page.jsx         #   "/leads" — Lead Table screen (search/filter/sort state)
    globals.css            #   Tailwind entrypoint + base styles
  components/
    layout/                # Sidebar, Topbar — chrome shared across screens
    leads/                 # Lead Table feature (Leads | Deals toggle):
                           #   columns.js (26-col metadata), LeadTable,
                           #   LeadToolbar, LeadDealsPanel (row-expand: a lead's
                           #     deals + interest), LeadDetailSidebar,
                           #     ExpandedLeadRow, ImportModal, BulkAssignBar,
                           #     RoleSwitcher, statusStyles.js, …
    deals/                 # Deals table view: DealTable, DealFilters
    pipeline/              # Pipeline (deals Kanban): DealBoard, DealToolbar,
                           #   DealDetailSidebar, DealWinRequestModal
    app/
      settings/columns/      # Column Mapping admin screen (rename/alias/add/remove)
      settings/compensation/ # Admin: salaries, targets, commission catalog, release trigger
      settings/users/        # User Management (Admin)
      approvals/page.jsx     # Admin approvals queue (Pending + Approved tabs)
      pipeline/page.jsx      # deals Kanban
    components/
      analytics/             # AnalyticsPanel (role-aware KPIs, meters, earnings)
      settings/              # CatalogEditor, PersonCompTable/Modal
      users/                 # UserModal
  data/                    # ⚠️ MOCK DATA ONLY — throwaway, replaced by the API
    mockLeads.js           #   option lists + team (Admin+BDM+DSCs) + ~30 leads (prospects)
    mockDeals.js           #   deals seeded from the leads (new stage/approval model)
  lib/
    config.js              # env-driven config (API base URL, mock flag)
    statuses.js            # ⭐ SINGLE SOURCE OF TRUTH for lead status / deal stage / approval
    leadStatus.js          # pure lead-status derivation + validation (lost gate, computed cols)
    permissions.js         # pure can(user, action, resource) — BDM cannot approve
    leadsApi.js            # ⭐ DATA ACCESS LAYER (leads) — swap mock → API here
    dealsApi.js            # ⭐ DATA ACCESS LAYER (deals) — request/approve/reject/deliver/reverse
    useDeals.jsx           # shared deal hook (load + permissions + stage matrix + approval)
    commission.js          # pure per-deal commission math + held/payable split
    commissionLedger.js    # append-only ledger (accrual / release / reversal) + reducers
    audit.js               # append-only audit trail (who changed what, when)
    columnConfig.jsx       # editable column config (labels/aliases) + provider
    compConfig.jsx         # editable compensation/targets config + provider (Admin)
    analytics.js           # pure metrics + earnings computations
    leadImport.js          # pure Excel-import helpers (validate/dedupe/build)
    types.js               # JSDoc typedefs = the shared data contract
    format.js              # pure helpers (dates, INR, discount %, dashes)
docs/                      # this documentation set
```

> **Note:** `app/settings/*`, `app/approvals`, `app/pipeline` and
> `components/analytics` are real app code under `app/` and `components/` — NOT
> under `data/`. Only `src/data/` (mockLeads/mockDeals) is throwaway mock data
> the Laravel team deletes when wiring the API.

The Lead Table's columns are not hard-coded: `columns.js` is the **seed**, and
`lib/columnConfig.jsx` holds the live, editable config (labels + sheet-header
aliases + add/remove), which the Column Mapping screen edits and both the table
and the importer read from.

## Data flow (Lead Table example)

1. `src/app/leads/page.jsx` (a client component) calls `getLeads()` on mount.
2. `getLeads()` returns mock data now, or `fetch`es the API once configured.
3. The page holds UI state — search, filters, sort, selected row — and derives
   the visible rows with `useMemo`.
4. Presentational components render what they're given:
   - `LeadToolbar` — global search, the six multi-select filters, follow-up
     date presets, active-filter chips, and the column-picker (controlled).
   - `LeadTable` — renders only the visible columns (schema order), raises
     `onSort` / `onRowClick`; per-type cell rendering + computed Discount %.
   - `LeadDetailPanel` — slide-over showing every field, grouped.
5. Sorting/filtering/search are all derived in the page with `useMemo`; the
   column set is a `Set` of keys the column-picker toggles.

**Pattern to copy:** _smart page_ (owns state + data calls) → _dumb components_
(take props, raise events). Keep business rules out of components.

## Recipe — add a new screen

Example: the Pipeline/Kanban board (roadmap step 2).

1. **Route:** create `src/app/pipeline/page.jsx` (a client component if it holds
   state). Add it to the nav in `src/components/layout/Sidebar.jsx` (flip its
   `soon` flag off).
2. **Data:** reuse `getLeads()`; if you need new data, add a function to
   `src/lib/leadsApi.js` (or a sibling like `kpisApi.js`) — never fetch inside a
   component. Document the endpoint in [API_CONTRACT.md](./API_CONTRACT.md).
3. **Components:** put screen-specific pieces in `src/components/<feature>/`.
   Reuse shared bits (`LeadStatusBadge`, `Topbar`, `format.js`).
4. **Types:** if you introduce a new object, add a typedef to `src/lib/types.js`.
5. **Verify:** `npm run lint && npm run build`, then click through it in the
   browser. Open a PR (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

## Conventions

- **Styling:** Tailwind utility classes only; use the `brand` colour for primary
  actions/active states. No inline styles, no other CSS frameworks.
- **Naming:** components `PascalCase.jsx`; helpers/data `camelCase.js`.
- **Imports:** use the `@/` alias (maps to `src/`), e.g. `@/lib/leadsApi`.
- **Comments:** explain what the Laravel team must wire up; mark open decisions
  with `// TODO(backend):` or `// TODO:` and a short note.
- **No secrets in the frontend.** Only `NEXT_PUBLIC_*` values reach the browser.
