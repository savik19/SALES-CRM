# API Contract

> The contract between this frontend and the Laravel backend. Build these
> endpoints and return the shapes below, and the UI works with **zero component
> changes** — the frontend only ever calls the functions in
> [`src/lib/leadsApi.js`](../src/lib/leadsApi.js).

**Base URL:** configured via `NEXT_PUBLIC_API_BASE_URL` (see [`.env.example`](../.env.example)).
All responses are JSON. All dates are ISO `YYYY-MM-DD` strings.

The canonical field definitions live in [`src/lib/types.js`](../src/lib/types.js)
as JSDoc typedefs, and the option lists (with exact values + order) live in
[`src/data/mockLeads.js`](../src/data/mockLeads.js). Keep them in sync with this doc.

---

## How the frontend consumes this

| Frontend function (`src/lib/leadsApi.js`) | Endpoint               | Used by                        |
| ----------------------------------------- | ---------------------- | ------------------------------ |
| `getLeads()`                              | `GET /api/leads`       | Lead Table                     |
| `getLeadById(leadId)`                     | `GET /api/leads/:id`   | Lead detail (deep-link/future) |
| `updateLead(leadId, changes)`             | `PATCH /api/leads/:id` | Future edit/status changes     |

The frontend passes **no auth today**. When auth exists, add it in the `apiGet`
helper / `fetch` calls (one spot) — e.g. a Sanctum cookie (`credentials: "include"`)
or an `Authorization` header.

---

## Object shapes

### Lead (26-field schema)

```jsonc
{
  "leadId": "SCRIPT8073", // string, primary key
  "company": "Coromandel Suites", // string
  "industry": "Hospitality", // enum — INDUSTRIES (single-select)
  "contactPerson": "Rajesh Menon", // string, may be "" (scraped leads)
  "roleTitle": "General Manager", // string, may be ""
  "phone": "+91 98400 11223, +91 44 2851 0099", // TEXT — may be multiple,
  // comma-separated. NEVER a number.
  "email": "a@x.in, b@x.in", // TEXT — may be multiple, comma-separated; may be ""
  "city": "Chennai", // string
  "country": "India", // string, defaults to "India"
  "website": "https://…", // string url, may be ""
  "linkedinUrl": "https://…", // string url, may be ""
  "leadSource": "LinkedIn", // enum — LEAD_SOURCES (single-select)
  "leadStatus": "Negotiation", // enum — LEAD_STATUSES (single-select)
  "priority": "High", // enum — PRIORITIES (single-select)
  "assignedDscId": "u-anaya", // string → TeamMember.id
  "attemptCount": 5, // number
  "servicesPitched": ["Website Development", "AI Tools"], // multi-select, subset of SERVICES
  "servicesInterested": ["Website Development"], // multi-select
  "servicesOnboarded": [], // multi-select
  "quotedAmount": 350000, // number (Rupees) or null
  "closedAmount": null, // number (Rupees) or null
  "lostReason": "", // enum — LOST_REASONS; only when leadStatus = "Lost"
  "lastContactDate": "2026-07-09", // ISO date or ""
  "nextFollowUpDate": "2026-07-14", // ISO date or ""
  "notes": "Wants a revised quote…", // long text
}
```

> **Discount %** (schema column 22) is **computed, never stored**:
> `(quotedAmount − closedAmount) / quotedAmount × 100`. The frontend derives it;
> do not send it.

### TeamMember (DSC)

```jsonc
{
  "id": "u-anaya", // string, primary key (assignedDscId points here)
  "name": "Anaya Rao",
  "initials": "AR",
  "role": "dsc", // "dsc" | "bdm"
}
```

---

## Enum values (send these exact strings)

Order matters where noted — the frontend sorts/filters against these lists.

- **Lead Status** (single-select, 17, pipeline order — sort by this order, not
  alphabetically): `New, Attempted, Contacted, Details Shared, Interested,
Qualified, Meeting Scheduled, Meeting Done, Proposal Sent, Negotiation, Won,
Project Started, Project Delivered, Closed, Lost, On Hold, Cancelled`
  - 1–10 = active pipeline · 11–14 = post-sale (Won onward counts as won) · Lost
    and On Hold = exits from the active pipeline · Cancelled = a _won_ deal that
    fell apart (reachable only from Won / Project Started / Project Delivered).
- **Priority** (4): `Low, Medium, High, Urgent`
- **Lead Source** (7): `LinkedIn, Instagram, Referral, Website, Cold Email, Event, Other`
- **Industry** (14): `Hospitality, Healthcare, Manufacturing, Real Estate,
Education, Logistics, Tourism & Travel, Wellness Yoga & Ayurveda, Automobile,
Retail & Wholesale Trade, Professional & Financial Services, Events & Weddings,
Beauty & Personal Care, Agri-business & Food`
- **Lost Reason** (7): `Not Interested, No Budget, Chose Competitor, Unreachable,
Wrong Fit / Not Our Service, Bad Data (wrong number), No Response`
- **Services** (7, shared by the three Services multi-selects): `Custom Software,
SaaS Subscription, Website Development, Digital Marketing, AI Tools, Mobile App, Other`

---

## Endpoints

### `GET /api/leads`

**200** → `Lead[]`. (Once auth exists, scope server-side per the logged-in user.)

### `GET /api/leads/:id`

**200** → `Lead` · **404** if not found / not permitted.

### `PATCH /api/leads/:id`

Body: a partial `Lead` (only changed fields), e.g. `{ "leadStatus": "Won" }` or
`{ "assignedDscId": "u-kabir" }`. **200** → the full updated `Lead`.

### `POST /api/leads/assign` (BDM only)

Bulk-assign leads to one DSC. Body `{ "leadIds": string[], "dscId": string }`.
**200** → `{ "updated": string[] }`. Enforce BDM-only server-side.

### `POST /api/leads/import` (BDM only)

Commit imported rows. Body `{ "rows": Lead[] }`. Each row must arrive as
`leadStatus: "New"` and `assignedDscId: ""`. **200** → `{ "imported": number }`.

---

## Roles & scoping (Build Brief §4)

- **BDM** — sees all leads; can import, assign/reassign, bulk-assign, edit any field.
- **DSC** — sees ONLY their own leads (others + unassigned are hidden, not greyed);
  can edit their own leads' fields and status; **cannot** assign/reassign or import.

`assignedDscId` holds exactly one DSC id (or `""` for unassigned) and is set only
by the BDM. The frontend has a demo role switcher; real auth (`GET /api/me`) makes
the backend the source of truth for the role and the lead scoping.

## Excel import sheet

The scraped `.xlsx` contains exactly the **17 import-sheet columns** (marked in
`src/components/leads/columns.js` via `inImportSheet`, exposed as
`IMPORT_SHEET_HEADERS`): Lead Id, Company, Industry, Contact Person, Role / Title,
Phone, Email, City, Country, Website, LinkedIn URL, Lead Source, Lead Status,
Priority, Last Contact Date, Next Follow-up Date, Notes. Columns 18–26 are
CRM-only and filled in later. Duplicate detection matches on Phone OR Email OR
(Company + City).

## Endpoints to add as those screens are built

| Screen (roadmap)  | Suggested endpoints                                |
| ----------------- | -------------------------------------------------- |
| Team / assignment | `GET /api/team` → `TeamMember[]`                   |
| Auth              | `GET /api/me` → current user (drives role scoping) |
| Analytics / KPIs  | see `docs/ROADMAP.md`                              |

---

## Contract rules (please keep these)

1. **Field names and types stay exactly as above.** Renaming a field means
   touching the UI — coordinate first.
2. **Send enums as the exact label strings above.**
3. **Dates are ISO strings**, empty string when unset (not `null`).
4. **`phone` and `email` are strings** and may hold multiple comma-separated
   values. **`phone` is never a number type.**
5. **Amounts are plain numbers (Rupees) or `null`.** Never send "Discount %".
