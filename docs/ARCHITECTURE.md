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
  UI components  ──►  src/lib/leadsApi.js  ──►  (mock data | Laravel API)
   (never import mock data directly)         one swap point
```

Components receive data as props and call the **data layer** (`src/lib/*Api.js`).
They never import from `src/data/`. This is why the backend can be wired in one
place without touching the UI. See [API_CONTRACT.md](./API_CONTRACT.md).

## Folder map

```
src/
  app/                     # Next.js App Router — one folder per route
    layout.jsx             #   app shell (sidebar + main); global font/metadata
    page.jsx               #   "/"  → redirects to /leads
    leads/page.jsx         #   "/leads" — the Lead Table screen (state lives here)
    globals.css            #   Tailwind entrypoint + base styles
  components/
    layout/                # Sidebar, Topbar — chrome shared across screens
    leads/                 # Lead-specific presentational components
  data/                    # ⚠️ MOCK DATA ONLY — throwaway, replaced by the API
    mockLeads.js           #   ~20 sample leads (full Lead shape)
    statuses.js            #   status pipeline, colours, raw→clean mapping
    users.js               #   team members (DSCs + BDM)
  lib/
    config.js              # env-driven config (API base URL, mock flag)
    leadsApi.js            # ⭐ DATA ACCESS LAYER — swap mock → API here
    types.js               # JSDoc typedefs = the shared data contract
    format.js              # pure display helpers (dates, dashes, overdue)
docs/                      # this documentation set
```

## Data flow (Lead Table example)

1. `src/app/leads/page.jsx` (a client component) calls `getLeads()` on mount.
2. `getLeads()` returns mock data now, or `fetch`es the API once configured.
3. The page holds UI state — search, filters, sort, selected row — and derives
   the visible rows with `useMemo`.
4. Presentational components render what they're given:
   - `LeadFilters` — search + status/DSC filters (controlled by the page).
   - `LeadTable` — renders rows, raises `onSort` / `onRowClick`.
   - `LeadDetailPanel` — slide-over with the full lead + status changer.
5. A status change calls `updateLead()` (optimistic UI now; real persistence
   once the PATCH endpoint exists).

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
