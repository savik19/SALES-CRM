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
| 23  | Quoted Amount       | number (Rs.)  | No — CRM only    | No      |
| 24  | Closed Amount       | number (Rs.)  | No — CRM only    | No      |
| 25  | Discount %          | computed      | No — CRM only    | No      |
| 26  | Lost Reason         | single-select | No — CRM only    | No      |

- **Import sheet** = columns 1–17 only (the scraped `.xlsx`). Columns 18–26 are
  CRM-only, filled in by the team after import.
- **Phone** stays text (may hold multiple comma-separated numbers) — never a number type.
- **Discount %** = `(Quoted − Closed) / Quoted × 100`, computed on the fly, never stored.
- **Services** columns render as chips (first two + "+N"). Long/among-many cells
  truncate with a tooltip and expand on click; columns are resizable; a row's
  expand arrow opens an inline editor for every field.

---

## 6. Lead statuses (pipeline — 17 values, fixed order)

`New → Attempted → Contacted → Details Shared → Interested → Qualified →
Meeting Scheduled → Meeting Done → Proposal Sent → Negotiation → Won →
Project Started → Project Delivered → Closed → Lost → On Hold → Cancelled`

- **1–10** (New → Negotiation) = active sales pipeline.
- **11–14** (Won → Closed) = post-sale; anything at Won or beyond counts as won.
- **Lost** and **On Hold** are exits from the active pipeline.
- **Cancelled** = a _won_ deal that fell apart (reachable only from Won, Project
  Started, or Project Delivered) — not the same as Lost.

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
