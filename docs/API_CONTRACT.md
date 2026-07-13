# API Contract

> The contract between this frontend and the Laravel backend. Build these
> endpoints and return the shapes below, and the UI works with **zero component
> changes** — the frontend only ever calls the functions in
> [`src/lib/leadsApi.js`](../src/lib/leadsApi.js).

**Base URL:** configured via `NEXT_PUBLIC_API_BASE_URL` (see [`.env.example`](../.env.example)).
All responses are JSON. All dates are ISO `YYYY-MM-DD` strings.

The canonical field definitions live in [`src/lib/types.js`](../src/lib/types.js)
as JSDoc typedefs — keep this doc and that file in sync.

---

## How the frontend consumes this

| Frontend function (`src/lib/leadsApi.js`) | Endpoint               | Used by                        |
| ----------------------------------------- | ---------------------- | ------------------------------ |
| `getLeads()`                              | `GET /api/leads`       | Lead Table                     |
| `getLeadById(id)`                         | `GET /api/leads/:id`   | Lead detail (deep-link/future) |
| `updateLead(id, changes)`                 | `PATCH /api/leads/:id` | Status change, reassignment    |

The frontend passes **no auth today**. When auth exists, add it in the `apiGet`
helper / `fetch` calls (one spot) — e.g. a Sanctum cookie (`credentials: "include"`)
or an `Authorization` header.

---

## Object shapes

### Lead

```jsonc
{
  "id": "L-1001", // string, primary key
  "company": "Prestige Realty", // string
  "industry": "Real Estate", // string
  "website": "https://…", // string, may be "" or "N/A"
  "contactPerson": "Vikram Shah", // string, may be ""
  "designation": "Director", // string
  "phone": "+91 98200 11223", // string (free text — DO NOT store as number)
  "email": "vikram@…", // string, may be "-"
  "location": "Mumbai", // string (city)
  "status": "in_progress", // enum — see Status keys below
  "budget": "200K", // string (free text: "200K", "Yet to confirm")
  "remarks": "Sent pricing deck", // string (long, free-form)
  "lastFollowUp": "2026-07-07", // ISO date or ""
  "nextFollowUp": "2026-07-11", // ISO date or ""
  "assignedDscId": "u-anaya", // string → TeamMember.id
  "source": "LinkedIn", // string ("LinkedIn", "Cold Call", "Referral"…)
}
```

### TeamMember

```jsonc
{
  "id": "u-anaya", // string, primary key
  "name": "Anaya Rao",
  "role": "dsc", // "dsc" | "bdm"
  "initials": "AR", // two letters (avatar)
}
```

### Status keys (enum)

Store the **key** on a lead. Labels/colours live on the frontend
([`src/data/statuses.js`](../src/data/statuses.js)), so the API only sends keys.

`new` · `first_call_pending` · `in_progress` · `follow_up` · `demo_proposal` ·
`on_hold` · `won` · `dropped` · `not_connecting`

A raw→clean mapping for importing the legacy master sheet is in `statuses.js`
(`RAW_STATUS_MAP`) — reuse it on the backend importer.

### KpiEntry (for the upcoming KPI/Analytics screens — Brief §7)

One record per DSC per day.

```jsonc
{
  "dscId": "u-anaya",
  "date": "2026-07-13",
  "callsMade": 40,
  "connectedCalls": 22,
  "callBacks": 5,
  "callsNotConnected": 18,
  "linkedinConnectsSent": 30,
  "linkedinMessagesSent": 12,
}
```

---

## Endpoints

### `GET /api/leads`

Returns the leads the **authenticated user** is allowed to see (Brief §4):

- **DSC** → only leads where `assignedDscId` = the caller.
- **BDM/Manager** → all leads.

> Role scoping is the backend's job (it knows who is logged in). The frontend's
> "Viewing as" switcher is a mock-only preview and goes away once auth is wired.

**200** → `Lead[]`

### `GET /api/leads/:id`

**200** → `Lead` · **404** if not found / not permitted.

### `PATCH /api/leads/:id`

Body: a partial `Lead` (only changed fields), e.g. `{ "status": "won" }` or
`{ "assignedDscId": "u-kabir" }`.

**200** → the full updated `Lead` (server's canonical row).

---

## Endpoints to add as those screens are built

These aren't called yet — add them alongside the matching frontend screen and
extend `src/lib/leadsApi.js` (or a sibling `kpisApi.js`) the same way.

| Screen (roadmap)  | Suggested endpoints                                               |
| ----------------- | ----------------------------------------------------------------- |
| Team / assignment | `GET /api/team` → `TeamMember[]`                                  |
| KPIs              | `GET /api/kpis?dscId=&from=&to=` → `KpiEntry[]`; `POST /api/kpis` |
| Analytics         | `GET /api/analytics/leads?groupBy=status\|industry\|location`     |
| Auth              | `GET /api/me` → current `TeamMember` (drives role scoping)        |
| Targets           | `GET /api/targets` → company + per-DSC monthly targets            |

---

## Contract rules (please keep these)

1. **Field names and types stay exactly as above.** Renaming a field means
   touching the UI — coordinate first.
2. **Send status/role as keys, not labels.** Presentation is the frontend's job.
3. **Dates are ISO strings**, empty string when unset (not `null`), to match the
   current components. If you prefer `null`, tell the frontend so helpers adjust.
4. **`phone` and `budget` are strings** — the source data is messy on purpose.
