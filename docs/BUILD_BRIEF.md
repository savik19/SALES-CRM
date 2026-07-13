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

## 5. Lead Table — column schema (from the real master sheet)

| Field               | Type      | Notes                                                            |
| ------------------- | --------- | ---------------------------------------------------------------- |
| Company             | text      | Prospect company name                                            |
| Industry            | text      | e.g. Real Estate, Manufacturing, Dermatologist, Dental, Pet Shop |
| Website             | url       | May be empty / "N/A"                                             |
| Contact Person      | text      | May be empty                                                     |
| Designation         | text      | e.g. Owner, Operational Manager, Director                        |
| Phone Number        | text      | Keep as text (formatting varies)                                 |
| Email               | text      | Often missing ("-")                                              |
| Location            | text      | City                                                             |
| Status              | enum      | See §6                                                           |
| Budget              | text      | Messy in source ("200K", "30K", "Yet to confirm") — text for now |
| Remarks             | long text | Free-form notes / follow-up context                              |
| Last Follow-up Date | date      | "Last FUP Date" in the sheet                                     |
| Next Follow-up Date | date      | "Next FUP Date" in the sheet                                     |

**Fields the CRM needs that the sheet does NOT have (add these):**

- **Assigned DSC** — which consultant owns the lead (required for role-based filtering).
- **Source** — where the lead came from (LinkedIn, cold call, referral, etc.). Optional but useful.

Table requirements for the first build: sortable columns, a search box, a status filter,
colour-coded status badges (brand blue for active states), and a row click that opens a
lead detail panel/page. Use mock data (~15–20 realistic rows).

---

## 6. Lead statuses (pipeline)

The source sheet has messy, inconsistent statuses. Normalise to this clean pipeline
(adjust only with Prakhar's sign-off):

`New → First Call Pending → In Progress → Follow-up → Demo / Proposal → On Hold → Won → Dropped`

Plus a non-pipeline state: **Not Connecting** (unable to reach the prospect).

Raw statuses seen in the sheet, for mapping reference: New, First Call Pending, In Progress,
On Hold, Follow Back, Call not Connecting, Dropped, Open.

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
