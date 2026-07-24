# ScriptGuru CRM — Frontend

In-house sales CRM for the ScriptGuru team. **This repo is the frontend only**
(React / Next.js). The backend — database, auth, and REST/JSON APIs — is built
separately by the Laravel team, who later swap the mock data for real API calls.

It is built as a **reusable foundation**: the dev team extends it into a full
product rather than starting from scratch. The architecture keeps all sample
data in one place and all data-fetching behind one swap point, so wiring the real
backend touches a single file.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # leave API_BASE_URL blank → uses mock data
npm run dev                  # http://localhost:3000  → redirects to /leads
```

Requires **Node 22** (`nvm use` reads `.nvmrc`). Other scripts:
`npm run build`, `npm run start`, `npm run lint`, `npm run format`.

## Documentation

Start here, in this order:

| Doc                                            | What it covers                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md)   | The product brief — scope, roles, columns, statuses. **Source of truth.** |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the code is organised + a recipe to add a screen.                     |
| [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) | **For the Laravel team** — endpoints + JSON shapes to build.              |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)           | Build order (steps 1–5) mapped to modules/PRs + backend track.            |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | Run, branch, commit, and PR conventions.                                  |

## Tech

- **Next.js (App Router)** + React 18 — portable to Laravel/Inertia later.
- **Tailwind CSS** only. Brand blue `#1060E0` = Tailwind `brand`. Font: IBM Plex Sans.
- **JavaScript / JSX** with **JSDoc typedefs** (`src/lib/types.js`) for the data contract.
- **ESLint** + **Prettier** + **EditorConfig** for consistent code.

## Project structure

```
src/
  app/                 # routes (App Router)
    leads/page.jsx     # Lead Table screen (state lives here)
    layout.jsx         # app shell (sidebar + main)
  components/           # layout/ + leads/ (presentational components)
  data/                # ⚠️ MOCK DATA — throwaway, replaced by the API
  lib/
    leadsApi.js        # ⭐ DATA ACCESS LAYER — swap mock → API here
    config.js          # env-driven config (API base URL, mock flag)
    types.js           # JSDoc typedefs = the shared data contract
    format.js          # display helpers
docs/                  # architecture, API contract, roadmap, build brief
```

## Wiring the backend (for the Laravel team)

The UI never imports mock data directly — every screen calls the async functions
in **[`src/lib/leadsApi.js`](src/lib/leadsApi.js)**. To go live:

1. Build the endpoints in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).
2. Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. This flips the app off mock
   data; the `fetch` branches already stubbed in `leadsApi.js` take over.
3. Add auth headers/credentials in the one `fetch` helper.
4. Delete `src/data/*` and the mock branches once every endpoint is live.

Return shapes must match [`src/lib/types.js`](src/lib/types.js) — then the UI
works unchanged.

## Build status

- ✅ **Lead Table** — configurable columns, search, filters, row-click detail
  with inline editing, the **Leads | Deals** toggle, the 10-value lead status
  (derived `in_discussion` / `won` badges), and five computed deal-count columns.
- ✅ **Pipeline / Kanban** — deals board: 4 drag stages (Open · Proposal Sent ·
  Negotiation · Cancelled) + read-only Started / Delivered columns; approval
  filter; pending deals locked.
- ✅ **Approvals** — Admin queue grouped by lead (commission-to-credit,
  discount-over-20% flag, bulk approve, reason-required reject) + an Approved tab
  (Set Delivered / Reverse). The BDM sees it read-only.
- ✅ **Analytics** — role-aware KPIs, deal-based targets, and commission split
  into **Earned (held)** vs **Payable**.
- ✅ **Settings** — User Management, Column Mapping, Compensation (per-role
  packages, offering catalog, commission-release trigger).

Business rules live in pure modules (`src/lib/statuses.js`, `leadStatus.js`,
`permissions.js`, `commission.js`, `commissionLedger.js`, `audit.js`); see
[`docs/ROADMAP.md`](docs/ROADMAP.md).

## Deployment

Auto-deploys from `main` to Vercel (Next.js preset; `vercel.json` pins the
framework). Production: `sales-crm-lilac-chi.vercel.app`.
