# ScriptGuru CRM — Frontend

In-house sales CRM for the ScriptGuru team. **This repo is the frontend only**
(React / Next.js). The Laravel team builds the database, auth, and APIs and later
swaps the mock data for real API calls.

See [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md) — the single source of truth for
scope, conventions, and build order.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000  → redirects to /leads
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Tech

- **Next.js (App Router)** with React function components — drops cleanly into
  the Laravel/Inertia setup later. Components are plain and portable.
- **Tailwind CSS** only. Brand blue `#1060E0` is the Tailwind `brand` colour.
- **Font:** IBM Plex Sans (falls back to Arial).
- **JavaScript / JSX** (no TypeScript) to stay approachable.

## Project structure

```
src/
  app/
    layout.jsx            # app shell (sidebar + main)
    page.jsx              # "/" → redirects to /leads
    leads/page.jsx        # Lead Table screen (search / filter / sort / detail)
    globals.css
  components/
    layout/               # Sidebar, Topbar
    leads/                # LeadTable, LeadFilters, LeadStatusBadge, LeadDetailPanel
  data/                   # ⚠️ MOCK DATA — throwaway placeholder data lives here
    mockLeads.js          #    ~20 realistic leads (full §5 schema)
    statuses.js           #    the status pipeline (§6) + raw→clean mapping
    users.js              #    DSCs + BDM (for role scoping and assignment)
  lib/
    leadsApi.js           # ⭐ DATA ACCESS LAYER — the ONE place to swap mock → API
    format.js             # small display helpers (dates, dashes, overdue check)
```

## For the Laravel team — where to wire the API

The UI **never** imports mock data directly. Every screen calls the async
functions in **`src/lib/leadsApi.js`** (`getLeads`, `getLeadById`, `updateLead`).
To go live, replace the bodies of those functions with `fetch()` calls to your
endpoints — **keep the return shape the same** (documented at the top of
`src/data/mockLeads.js`) and the UI keeps working untouched. That's the only file
you should need to change to connect the data.

Role scoping (DSC sees only their own leads; BDM sees all) is the backend's job
server-side. The frontend has a "Viewing as" switcher only to preview that
behaviour during development.

## Build status

Built so far (per brief §3 build order):

- ✅ **1. Lead Table** — sortable columns, search, status + DSC filters,
  colour-coded status badges, row-click detail panel with the full field set and
  an inline status changer. Overdue follow-ups are highlighted.

Next up: Pipeline/Kanban → Analytics → KPIs → full role-based dashboards.
