# ScriptGuru CRM — Build Brief

> This file is the source of truth for building the ScriptGuru in-house CRM frontend.
> Read this fully before writing or changing any code. Keep it updated as decisions change.

---

## Build log (decisions made while building)

- **2026-07-10** — Scaffolded the frontend. Stack chosen to satisfy §2:
  **Next.js 15 (App Router) + React 18 + Tailwind CSS**, plain **JavaScript/JSX**
  (matches the `src/data/mockLeads.js` convention in the brief, stays approachable
  for the Laravel team). Brand blue wired as the Tailwind `brand` colour; IBM Plex
  Sans loaded with an Arial fallback.
  - All mock data isolated under `src/data/`; the single swap point for the Laravel
    team is `src/lib/leadsApi.js` (see README).
  - **Step 1 (Lead Table) built and verified** in a browser: sort, search, status +
    DSC filters, colour-coded badges, row-click detail panel with the full field
    set + inline status changer, overdue-follow-up highlight, and a "Viewing as"
    switcher previewing DSC-vs-BDM scoping (§4). Steps 2–5 not started.
  - Deployed to Vercel from `main` (Next.js preset pinned via `vercel.json`;
    Node pinned to 22 via `engines`).
- **2026-07-13** — Developer-handoff pass so the dev team can extend this into a
  full product without friction:
  - Added the shared data contract in code (`src/lib/types.js` JSDoc typedefs)
    and env-driven config (`src/lib/config.js` + `.env.example`); `leadsApi.js`
    now has real `fetch` branches gated by a mock flag.
  - Added the docs set: `ARCHITECTURE.md`, `API_CONTRACT.md`, `ROADMAP.md`, and
    `CONTRIBUTING.md`; README turned into an index.
  - Added tooling (ESLint + Prettier + EditorConfig + `.nvmrc`) and GitHub
    scaffolding (PR/issue templates, CI running lint + format + build).
- **2026-07-13** — Rebuilt the Lead Table onto the full **26-column schema**
  (see §5 below, which is now the richer master schema — Lead Id → Notes):
  - Single mock-data file `src/data/mockLeads.js` holds all option lists
    (17 statuses, 4 priorities, 7 sources, 14 industries, 7 lost reasons,
    7 services), the DSCs, and ~20 leads. `statuses.js`/`users.js` folded in.
  - 10 default columns + a column-picker for the other 16; per-type sorting
    (status by pipeline order); global search; six multi-select filters + a
    follow-up date-range preset; active-filter chips; computed Discount %;
    Services rendered as chips; grouped detail slide-over.
  - `types.js` and `API_CONTRACT.md` updated to the new schema. Verified in a
    browser; lint/format/build green.
- **2026-07-13** — Extended the Lead Table with the reordered 26-column schema
  (Assigned DSC → col 18; identity → contact → location → status → dates → notes
  → CRM-only), roles, and Excel import:
  - **Column UX:** cells truncate with tooltip + click-to-expand, resizable
    columns (drag borders), Services as chips (+N popover), row expand arrow →
    inline editor for every field, column-picker (10 defaults + toggle rest).
  - **Excel import (BDM):** upload `.xlsx` (17 sheet columns), header validation,
    preview + dedupe (Phone / Email / Company+City), commit as New + unassigned,
    and a summary (imported / skipped-dupe / failed). Uses `read-excel-file`;
    pure logic in `src/lib/leadImport.js`.
  - **Roles (§4):** BDM sees all + imports + (bulk-)assigns + edits any field;
    DSC sees only their own leads (others/unassigned hidden), edits their own
    fields, cannot assign/import. Demo role switcher; `assignedDscId` holds one
    DSC, BDM-set. Bulk-assign via checkboxes.
  - Filters gained an "Unassigned" DSC option. ~30 mock leads (unassigned News,
    4 DSCs, blanks, Won/Lost amounts, a 4-service row). Verified in a browser.
- **2026-07-13** — Hardened the Excel import for real scraped sheets: switched
  the parser to **ExcelJS** (reliably reads real `.xlsx`, incl. date cells),
  made header matching **tolerant** (case/spacing/punctuation + common aliases
  like "Phone Number"/"Lead ID"/"Location"), **ignore extra columns** (shown as
  a warning, only block on genuinely missing required columns), skip blank rows,
  and added a **loading state** so the modal never sits dead after a file pick.
  Verified with a messy fixture (aliased + reordered headers, an extra column,
  real date cells): 2 new / 1 duplicate / 1 error, dates rendered correctly.
- **2026-07-13** — Editable columns + detail UX:
  - **Column Mapping screen** (`/settings/columns`): the BDM renames CRM columns,
    edits the sheet-header aliases each maps to, toggles import-sheet membership,
    and adds/removes columns — click **Update** to apply. Config lives in an
    editable context (`src/lib/columnConfig`), seeded from `columns.js`, persisted
    to localStorage (TODO: `GET/PUT /api/columns`). It drives BOTH the table
    headers and the import matching.
  - **All columns visible by default**; column-picker gains **Select all** +
    **Reset** (deselect all).
  - **Detail sidebar** on Company/Lead Id click (slide-over) alongside the row
    expand-arrow dropdown — both show every field with the editable ones editable
    (shared `ExpandedLeadRow`).
  - **Import fix:** bounded the parse to the real header width so large/stray
    column counts no longer freeze the "Reading…" step; the **Import button is
    always visible**, enabled only after a clean parse.
- **2026-07-13** — Analytics + compensation + Admin role:
  - **Toggleable Analytics panel** on the Lead Table, role-aware: a DSC sees
    their own metrics + monthly target + earnings; BDM/Admin see team KPIs,
    the company target, a status distribution, a per-DSC table, and BDM earnings.
  - **Compensation model** (`src/lib/analytics.js`) driven entirely by an
    editable config (`src/lib/compConfig`): 75% fixed salary always paid;
    performance pay (25%) + commission (BDM 5% of all sales, DSC 3% of own)
    paid ONLY if the monthly target is met; DSCs get a lower training salary for
    the (configurable) training-cum-probation months. Statutory deduction on
    gross. Seeded from the offer letters (DSC ₹25k, BDM ₹40k) — all variables.
  - **Admin role** + **Compensation screen** (`/settings/compensation`): the
    Admin edits salaries, targets, commission %, training length/amount, and
    deductions; changes reflect immediately in the DSC/BDM analytics (verified:
    lowering the DSC target unlocks a DSC's commission live).

- **2026-07-24** — **Status Model Redesign + Module Hardening.** Collapsed the
  lead status from 17 → **10** and formalised the Lead → Deal relationship,
  approval workflow, commission ledger, and audit trail. See §6 (rewritten).
  - **Lead status (10):** 7 manual (`new`, `attempted`, `contacted`,
    `details_shared`, `interested`, `meeting_scheduled`, `meeting_done`) + 2
    **derived** (`in_discussion`, `won`) + `lost` (manual, gated). Proposal Sent
    and Negotiation moved onto the **deal** (a lead holds N deals, so no single
    lead status can describe transaction progress). Derivation is pure in
    `src/lib/leadStatus.js`; the 10 values live in `src/lib/statuses.js`.
  - **Deal = two independent fields:** `stage` (open · proposal_sent ·
    negotiation · project_started · project_delivered · cancelled) and `approval`
    (not_requested · pending · approved · rejected · reversed). `closedAmount`
    renamed `finalAmount` (the commission base — never the quote). Stage
    editability matrix + approval flow in `src/lib/useDeals.jsx` / `dealsApi.js`.
  - **Commission ledger** (`src/lib/commissionLedger.js`): append-only entries
    (accrual on approve, release on deliver, reversal on reverse) that snapshot
    the comp rule so historical payouts never change. `commissionReleaseTrigger`
    config (default `project_delivered`) drives Earned (held) vs Payable.
  - **Audit trail** (`src/lib/audit.js`) + Activity sections on both sidebars.
  - **Permissions** (`src/lib/permissions.js`): single `can(user, action,
    resource)`; **BDM cannot approve** (money-control conflict of interest).
  - Rebuilt Approvals (Pending grouped by lead + Approved tab with Set Delivered
    / Reverse), the Kanban (4 drag stages + read-only Started/Delivered), and the
    5 computed lead deal-count columns. `npm run lint && build` green; verified.

---

## 1. What we are building

An in-house CRM for the ScriptGuru sales team. This repository is the **frontend only**,
built in **React** (compatible with Next.js). The backend (database, auth, business logic,
APIs) is built separately by the ScriptGuru dev team in **PHP Laravel**.

**Division of responsibility**

- This repo: all screens, layout, components, states, and workflow — built with realistic
  **mock/placeholder data** for now.
- Laravel team: database, authentication, permissions, and REST/JSON APIs. They will later
  replace the mock data with real API calls.

**Because of this, keep all mock data in ONE clearly-marked place** (e.g. `src/data/mockLeads.js`),
and keep data-fetching isolated in small functions, so the Laravel dev can swap mock → API in
one obvious spot without touching the UI.

---

## 2. Tech & design conventions

- **Framework:** React function components (must drop cleanly into Next.js / Inertia later).
- **Styling:** Tailwind CSS only.
- **Brand colour (primary):** `#1060E0` (ScriptGuru blue). Use for primary buttons, active
  states, links, highlights.
- **Font:** Arial or IBM Plex Sans.
- **No backend logic in the frontend.** No hardcoded business rules that belong on the server.
- **Component structure should map to future API endpoints** (e.g. a `LeadTable` that expects
  a `leads` array it does not fetch itself).
- Keep it clean, readable, and commented where a non-developer or the Laravel team needs to
  understand what to wire up.

---

## 3. Build order (do these in sequence)

1. **Lead Table** ← START HERE. The core screen listing all leads (see §5).
2. **Statuses** — status pipeline + a way to change a lead's status; later a Kanban/board view.
3. **Analytics** — charts and summaries over leads (by status, industry, location, value).
4. **KPIs** — the daily activity metrics per DSC (see §7).
5. **Role-based views** — what the DSC sees vs what the BDM/Manager sees (see §4).

Do not jump ahead. Get each screen working and reviewed before starting the next.

---

## 4. Roles (two-tier sales team)

- **DSC (Digital Solution Consultant)** — front-line sales.
  - Sees **only their own leads**.
  - Logs their **own daily activity** (calls, LinkedIn outreach).
  - Dashboard shows: my leads, my follow-ups due today, my activity numbers, my target vs achieved.
- **BDM / Manager** — leads the DSC team.
  - Sees **all leads across the whole team**.
  - Sees **team analytics** and **each DSC's KPIs**.
  - Sees **targets vs achieved** (company target and per-DSC targets).
  - Can reassign leads and oversee the pipeline.

Reference targets (for the BDM dashboard later): company monthly target ~Rs. 10,00,000;
per-DSC monthly target ~Rs. 5,00,000. (Confirm current numbers before hardcoding — prefer
passing them in as data, not constants.)

---

## 5. Lead Table — column schema (26-column master schema)

Full field-by-field contract: [`docs/API_CONTRACT.md`](./API_CONTRACT.md) and
[`src/lib/types.js`](../src/lib/types.js). Option lists (exact values + order):
[`src/data/mockLeads.js`](../src/data/mockLeads.js). Columns, in fixed
left-to-right order (identity → contact → location → status → ownership →
commercial → dates → notes) — 10 shown by default, the rest via a column-picker:

| #   | Column              | Type          | In import sheet? | Default |
| --- | ------------------- | ------------- | ---------------- | ------- |
| 1   | Lead Id             | text          | Yes              | Yes     |
| 2   | Company             | text          | Yes              | Yes     |
| 3   | Industry            | single-select | Yes              | Yes     |
| 4   | Contact Person      | text          | Yes              | Yes     |
| 5   | Role / Title        | text          | Yes              | No      |
| 6   | Phone               | text (multi)  | Yes              | Yes     |
| 7   | Email               | text (multi)  | Yes              | No      |
| 8   | City                | text          | Yes              | Yes     |
| 9   | Country             | text (India)  | Yes              | No      |
| 10  | Website             | url           | Yes              | No      |
| 11  | LinkedIn URL        | url           | Yes              | No      |
| 12  | Lead Source         | single-select | Yes              | No      |
| 13  | Lead Status         | single-select | Yes              | Yes     |
| 14  | Priority            | single-select | Yes              | Yes     |
| 15  | Last Contact Date   | date          | Yes              | No      |
| 16  | Next Follow-up Date | date          | Yes              | Yes     |
| 17  | Notes               | long text     | Yes              | No      |
| 18  | Assigned DSC        | single-select | No — CRM only    | Yes     |
| 19  | Attempt Count       | number        | No — CRM only    | No      |
| 20  | Services Pitched    | multi-select  | No — CRM only    | No      |
| 21  | Services Interested | multi-select  | No — CRM only    | No      |
| 22  | Services Onboarded  | multi-select  | No — CRM only    | No      |

- **Money moved to the DEAL.** Quoted / Closed / Discount / Lost Reason no longer
  live on the lead — a lead holds many deals, and money is per deal. `finalAmount`,
  `quotedAmount`, discount and cancellation reason are Deal fields.
- **Computed deal-count columns** (derived from the lead's deals, non-mappable,
  sortable): `dealsTotal`, `dealsLive`, `dealsStarted`, `dealsDelivered`,
  `wonValue`. Registered through `lib/columnConfig.jsx` with `computed: true`.
- **Import sheet** = columns 1–17 only (the scraped `.xlsx`). Columns 18–22 are
  CRM-only, filled in by the team after import.
- **Phone** stays text (may hold multiple comma-separated numbers) — never a number type.
- **Services** columns render as chips (first two + "+N"). Long/among-many cells
  truncate with a tooltip and expand on click; columns are resizable; a row's
  expand arrow opens an inline editor for every field.

---

## 6. Status model (single source of truth: `src/lib/statuses.js`)

### 6.1 Lead status — 10 values

| #   | Key                 | Label             | Set by            |
| --- | ------------------- | ----------------- | ----------------- |
| 1   | `new`               | New               | system (on import)|
| 2   | `attempted`         | Attempted         | DSC / BDM         |
| 3   | `contacted`         | Contacted         | DSC / BDM         |
| 4   | `details_shared`    | Details Shared    | DSC / BDM         |
| 5   | `interested`        | Interested        | DSC / BDM         |
| 6   | `meeting_scheduled` | Meeting Scheduled | DSC / BDM         |
| 7   | `meeting_done`      | Meeting Done      | DSC / BDM         |
| 8   | `in_discussion`     | In Discussion     | **derived**       |
| 9   | `won`               | Won               | **derived**       |
| 10  | `lost`              | Lost              | DSC / BDM (gated)  |

- **Why derived?** Proposal Sent and Negotiation now live on the **deal**, not
  the lead. A lead can hold many deals, so any lead status describing transaction
  progress cannot represent N deals in one value. Statuses 8–9 are computed from
  the lead's deals by `deriveLeadStatus(lead, deals)` (pure, in `lib/leadStatus.js`):
  - `won` if the lead has **any approved deal** (a one-way door — a customer
    forever, even if later deals cancel), or the lead is already `won`.
  - else `in_discussion` if the lead has a **live** deal (open / proposal_sent /
    negotiation).
  - else the stored manual status.
- **Validation:** `in_discussion` / `won` are never user-selectable and the API
  must reject them on write. `lost` is settable **only** when the lead has zero
  approved deals (gated in the UI _and_ the data layer). Once `won`, the manual
  dropdown is disabled.

### 6.2 Deal stage — 6 values (independent field)

`open → proposal_sent → negotiation` (user-controlled) · `project_started`
(system, on approval) · `project_delivered` (Admin) · `cancelled`.

### 6.3 Deal approval — 5 values (independent field)

`not_requested` (default) · `pending` (submitted) · `approved` (stage →
project_started, commission accrues) · `rejected` (reason required) · `reversed`
(previously-approved deal cancelled; stage → cancelled, negative ledger entry).

**Approval flow.** Owner requests approval (needs `finalAmount > 0`, an owner and
an offering; cancelled deals can never request) → `pending` (stage frozen) →
Admin **Approve** (accrual) / **Reject** (reason) / **Deliver** (release) /
**Reverse** (reversal). Every transition writes an **audit** entry.

Other single-selects (Priority, Lead Source, Industry, Lost Reason) and the
Services multi-select are enumerated in `src/data/mockLeads.js`.

---

## 7. Daily activity KPIs (per DSC, entered daily)

These are logged by each DSC daily and roll up into the KPI/analytics screens:

- Calls Made
- Connected Calls
- Call Backs
- Calls Not Connected
- LinkedIn Connects Sent
- LinkedIn Messages Sent

BDM view aggregates these across the team and per DSC, by day/week/month.

---

## 8. Working notes

- Prakhar (founder) directs the build and reviews output; the Laravel dev team consumes it.
- When in doubt about a business rule, leave a clear `// TODO:` and ask, rather than inventing it.
- Update this brief whenever a decision changes, so it stays the single source of truth.
