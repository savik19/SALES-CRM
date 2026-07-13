# Contributing

How to work in this repo so it stays clean as the team grows it into a full
product. New here? Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) first.

## Prerequisites

- **Node 22** (see `.nvmrc` → `nvm use`). Enforced via `engines` in package.json.
- npm (bundled with Node).

## Getting started

```bash
npm install
cp .env.example .env.local   # leave API_BASE_URL blank to use mock data
npm run dev                  # http://localhost:3000 → /leads
```

## Scripts

| Command                | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Dev server with hot reload                |
| `npm run build`        | Production build (run before every PR)    |
| `npm run start`        | Serve the production build                |
| `npm run lint`         | ESLint (`next/core-web-vitals`)           |
| `npm run format`       | Prettier — format all files               |
| `npm run format:check` | Prettier — verify formatting (used in CI) |

## Branching

- `main` is always deployable (Vercel auto-deploys it to production).
- Branch off `main` per unit of work. Suggested names:
  - `feature/<screen-or-thing>` — e.g. `feature/pipeline-kanban`
  - `fix/<bug>` — e.g. `fix/status-badge-colour`
  - `chore/<task>` — tooling, docs, config
- Keep branches small and focused — one screen/concern per branch.

## Commits

Use short, imperative messages, ideally [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add pipeline kanban board
fix: correct overdue follow-up highlight
docs: expand API contract for KPIs
chore: bump eslint config
```

## Pull requests

1. Rebase on the latest `main`.
2. Run `npm run lint && npm run format:check && npm run build` — all must pass
   (CI runs the same checks).
3. **Verify in the browser** — click through the screen you changed.
4. Open the PR and fill in the template. Keep PRs reviewable (roughly < ~400
   lines of non-generated diff where possible).
5. One approval → squash-merge into `main`.

**Scope PRs to the roadmap.** Map each PR to a step in
[`docs/ROADMAP.md`](docs/ROADMAP.md) so the history reads as a clear build order.

## Where things go (quick reference)

| You're adding…       | Put it in…                                         |
| -------------------- | -------------------------------------------------- |
| A new screen/route   | `src/app/<route>/page.jsx`                         |
| A reusable component | `src/components/<feature>/`                        |
| A data call (fetch)  | `src/lib/<thing>Api.js` — **never** in a component |
| A new object shape   | a JSDoc typedef in `src/lib/types.js`              |
| Mock/sample data     | `src/data/` (throwaway; replaced by the API)       |
| An env value         | `src/lib/config.js` + document in `.env.example`   |

Golden rule: **components take props and call the data layer; they never import
mock data.** That is what lets the Laravel team swap in real APIs in one place.
