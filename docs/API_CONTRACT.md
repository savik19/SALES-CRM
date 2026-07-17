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
  "assignedDate": "2026-07-02", // ISO date the lead was assigned to its DSC
  "closedDate": "2026-07-11", // ISO date a won lead was closed; "" otherwise
  "notes": "Wants a revised quote…", // long text
}
```

> **Discount %** (schema column 22) is **computed, never stored**:
> `(quotedAmount − closedAmount) / quotedAmount × 100`. The frontend derives it;
> do not send it.

**Analytics dates.** The Lead Table analytics are month-filtered and computed
client-side from the lead dates (`src/lib/analytics.js` → `monthMetrics`). Just
return accurate dates on each lead and the metrics follow:

- **Total leads** — all leads assigned to the person (all-time; not month-scoped).
- **Uncontacted** — leads with no `lastContactDate` yet (never contacted).
  All-time, **not** month-scoped (e.g. "500 uncontacted of 1000 total").
- **New assigned** — `assignedDate` in the selected month.
- **Contacted** — `lastContactDate` in the month.
- **Meeting scheduled** — leads currently at status `Meeting Scheduled` that were
  worked in the month (`lastContactDate` **or** `assignedDate` in the month).
- **Meeting done** — leads currently at status `Meeting Done` that were worked in
  the month.
- **Follow-ups due** — `nextFollowUpDate` in the month.
- **Closed (won)** — a won lead whose `closedDate` is in the month.
- **Pipeline value** — Σ `quotedAmount` of open leads worked (assigned/contacted)
  in the month.

Earnings/target for the month use "closed (won) in the month" as the closed count.

**Follow-up calendar filter.** The Lead Table has a date-range picker (a single
day = From == To, or an open-ended From/To) that filters rows by
`nextFollowUpDate`. It is a client-side view filter only — it does **not** scope
the analytics (those use the month selector). By default no range is set, so the
table shows **all** leads with the newest-assigned (`assignedDate` desc) on top.

**Pipeline period.** The Pipeline board is scoped to a **period** — a month
(default = current month, previous months selectable) or a calendar range that
overrides the month. A lead is "in the period" when **any** of its activity dates
(`assignedDate`, `lastContactDate`, `nextFollowUpDate`, `closedDate`) falls in it
(`leadInPeriod` in `src/lib/analytics.js`). This shows the leads actually worked
in that window instead of every lead ever created. The board's overview stats
(In pipeline, Open value = Σ `quotedAmount` of active leads, Won, Won value,
Overdue) are computed over that period set. A status change on the board (drag or
the card's select) is a normal lead edit and obeys the same permission model
below — read-only leads (a DSC's lead seen by a manager, or anything while a
manager is focused on a DSC) cannot be dragged or restaged.

**Pipeline excludes "New".** The board is a Kanban of deals being **actively
worked**, so it omits the `New` status — assigned-but-not-yet-worked leads that
can number in the thousands. They stay in the Lead Table (paginated) and their
count surfaces in the New-assigned / Uncontacted analytics; they never render as
Kanban cards. The board, its counts, and its filters all derive from this
"pipeline" set (every status **except** `New`). A **Status filter** lets any role
(Admin / BDM / DSC) narrow the board to specific stages — only the selected
status columns render, in funnel order; clearing it shows all pipeline stages.
For a real backend this is a client-side view rule; the API can still return all
statuses and the frontend decides what the board shows.

### TeamMember / User

Managed by the Admin on the **User Management** screen. `assignedDscId` on a Lead
points at `id`. The first four fields are all the Lead Table / analytics need; the
rest are HR details the Admin captures.

```jsonc
{
  "id": "u-anaya", // string, primary key (assignedDscId points here)
  "name": "Anaya Rao",
  "initials": "AR", // derived from name; backend may compute or ignore
  "role": "dsc", // "dsc" | "bdm" | "admin"
  "companyDomain": "scriptguru.in", // shapes companyEmail (slug@domain) on add
  "companyEmail": "anaya@scriptguru.in", // string — unique; the LOGIN handle
  "personalEmail": "a@gmail.com, b@x.com", // may be multiple, comma-separated
  "dialCode": "+91", // country code; prefixes new phone numbers on add
  "companyPhone": "+91 98111 22001", // string
  "personalPhone": "+91 98..., +91 99...", // may be multiple, comma-separated
  "address": "Rajpur Road, Dehradun", // string
  "city": "Dehradun", // string
  "salaryMonthly": 25000, // number (Rupees); post-training BASE salary (see below)
  "status": "active", // ACCOUNT: "added" | "invited" | "active" | "deactivated"
  "employmentStatus": "full_time", // HR: see EMPLOYMENT_STATUSES below
  "joiningDate": "2025-10-05", // ISO date; drives training window + tenure
}
```

**Employment status** (`employmentStatus`) values: `probation_training,
full_time, notice_period, resigned`.

**Employment duration** is **computed, never stored** — derive it from
`joiningDate` (see `employmentDuration()` / `monthsSince()` in `src/lib/format.js`).
The training-pay window also derives from `joiningDate` (months-since-joining <
`Compensation.dsc.trainingMonths`).

**`salaryMonthly` feeds compensation:** it is the person's **post-training base
salary** — `resolvePersonComp()` uses it as `baseSalaryMonthly` (DSC) /
`salaryMonthly` (BDM), overridable by a per-person compensation override. So
setting a hire's salary here is what the earnings analytics pay on.

**All fields are required when adding** a user (frontend enforces name, both
emails, both phones, address, city, joining date, and salary). `companyDomain`
and `dialCode` auto-shape the company email and phone format for new hires.

Two independent status fields:

- `status` (**account**) lifecycle: **added** (created by Admin, no invite sent)
  → **invited** (invite email sent, no password yet) → **active** (has set a
  password / logged in) → **deactivated** (left; hidden from login, assignment,
  filters and analytics, but kept for history). Adding a user and sending the
  invite are **separate** actions (`POST /api/users` then `POST
/api/users/:id/invite`). Only non-deactivated users appear in the role switcher
  and DSC assignment lists.
- `employmentStatus` (**HR**) is informational (probation/training, full-time,
  notice period, resigned) and independent of account access.

`companyEmail` is the unique login handle. The personal email/phone fields may
hold multiple comma-separated values.

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

Enforce the edit-permission model server-side (see **Roles & scoping**):

- Editing any field other than `assignedDscId` requires the caller to **own** the
  lead — a DSC editing their own lead, or a manager editing an unassigned lead or
  a lead assigned to themselves. A manager may **not** edit a lead assigned to a
  DSC (view-only). **403** otherwise.
- A reassignment (`assignedDscId` change) requires manager (BDM/Admin) rights.
  `assignedDscId` holds exactly one id (single assignee) or `""`. **403** for a DSC.

### `POST /api/leads/assign` (managers only)

Bulk-assign leads to one DSC. Body `{ "leadIds": string[], "dscId": string }`.
**200** → `{ "updated": string[] }`. Enforce manager-only (BDM/Admin) server-side.

### `POST /api/leads/import` (BDM only)

Commit imported rows. Body `{ "rows": Lead[] }`. Each row must arrive as
`leadStatus: "New"` and `assignedDscId: ""`. **200** → `{ "imported": number }`.

---

### User Management (Admin only)

The Admin adds/edits the team, deactivates leavers, and invites new joiners. The
frontend calls these through `src/lib/usersConfig.jsx` (currently a mock store —
swap the bodies for real fetches). Enforce Admin-only server-side.

- `GET /api/users` → `User[]` (whole team incl. deactivated).
- `POST /api/users` — add a user. Body: a `User` without `id`. Create with
  `status: "added"` and do **NOT** send an invite yet (adding and inviting are
  separate steps). **201** → the created `User`.
- `PUT /api/users/:id` — update HR details. **200** → the updated `User`.
- `PATCH /api/users/:id/status` — Body `{ "status": "active" | "deactivated" }`.
  Deactivating must revoke login and remove them from assignment lists. **200** →
  the updated `User`. (Consider reassigning their open leads on deactivation.)
- `POST /api/users/:id/invite` — send (or re-send) the invite email to their
  `companyEmail` and set `status: "invited"`. Triggered by the Admin from the
  row menu, separately from adding. **204**.

The invite → set-password flow (token email, `/set-password?token=…` page, first
login) is a backend concern; the UI only triggers the send and shows the result.

### Compensation & Targets (Admin only)

Salaries, targets, commission %, training and deductions. Two layers: **role
defaults** (`bdm`, `dsc`) that apply to everyone in a role, and **per-person
overrides** (`overrides[userId]`) — a partial package that wins only for the
fields it sets. The frontend reads/writes this through `src/lib/compConfig.jsx`
and resolves a person's effective package with `resolvePersonComp()` in
`src/lib/analytics.js` (`{ ...roleDefault, ...override }`). The DSC/BDM analytics
read the effective package, so an edit to a default or one person's override
reflects immediately.

```jsonc
{
  "currency": "INR",
  "deductionPct": 10, // statutory deduction applied to gross → net
  "bdm": {
    "salaryMonthly": 40000, // Fixed part + performance pay
    "fixedPortionPct": 75, // fixed always paid; the rest is target-gated
    "commissionPct": 5, // % of whole-team sales, if company target met
    "monthlyLeadTarget": 20, // company: closed leads / month
  },
  "dsc": {
    "baseSalaryMonthly": 25000, // post-training total
    "trainingSalaryMonthly": 15000, // flat pay during training
    "trainingMonths": 2, // joinedMonthsAgo < this ⇒ in training
    "fixedPortionPct": 75,
    "commissionPct": 3, // % of own sales, if own target met
    "monthlyLeadTarget": 5, // each DSC: closed leads / month
  },
  // Per-person overrides — only the keys present override that role default.
  "overrides": {
    "u-anaya": { "commissionPct": 10 }, // e.g. a DSC on a custom package
  },
}
```

Earnings rule (see `personEarnings`): the Fixed portion is always paid; the
Performance Pay **and** commission are paid ONLY when the person meets their
monthly target (`closed ≥ target`). A DSC within the training window gets the flat
training salary instead. Deductions apply to gross to get net take-home.

- `GET /api/compensation` → the config above.
- `PUT /api/compensation` — save the whole config (defaults + overrides). **200**.
- (Optional granular) `PUT /api/compensation/overrides/:userId` /
  `DELETE …/:userId` to set/clear one person's override.

## Roles & scoping (Build Brief §4)

- **Admin** — full oversight. Uses the top viewer switcher to view as the BDM or
  any DSC (demo); real auth scopes server-side.
- **BDM (medium)** — sees all leads and can import, assign/reassign, and
  bulk-assign. **Editing is restricted**: a BDM may edit fields only on
  **unassigned** leads or leads assigned to **themselves**; a lead assigned to a
  DSC is **view-only** (they can still reassign it, but not edit its other fields).
  A BDM can reassign a DSC's lead to another DSC. On the Lead Table the BDM gets a
  **Focus switcher** (All team / My leads / each DSC): focusing a DSC shows that
  DSC's analytics + leads **read-only**; "My leads" shows only the BDM's own leads
  and their own analytics.
- **DSC** — sees ONLY their own leads (others + unassigned are hidden, not greyed);
  can edit their own leads' fields and status; **cannot** assign/reassign or import,
  and has no Focus switcher.

The **same Focus switcher and permission model apply to the Pipeline** board: a
manager can focus it on the team, their own leads, or one DSC (read-only); a DSC
sees only their own board. Because a status change is a lead edit, only leads the
viewer may edit are draggable / restageable.

`assignedDscId` holds exactly **one** id (single assignee — no multiple assignees)
or `""` for unassigned, and is set only by a manager. The frontend has a demo role
switcher; real auth (`GET /api/me`) makes the backend the source of truth for the
role, the lead scoping, and the edit/assign permission checks above (the UI
disables the controls; the server must still enforce them).

## Excel import sheet

The scraped `.xlsx` contains exactly the **17 import-sheet columns** (marked in
`src/components/leads/columns.js` via `inImportSheet`, exposed as
`IMPORT_SHEET_HEADERS`): Lead Id, Company, Industry, Contact Person, Role / Title,
Phone, Email, City, Country, Website, LinkedIn URL, Lead Source, Lead Status,
Priority, Last Contact Date, Next Follow-up Date, Notes. Columns 18–26 are
CRM-only and filled in later. Duplicate detection matches on Phone OR Email OR
(Company + City).

## Endpoints to add as those screens are built

| Screen (roadmap) | Suggested endpoints                                           |
| ---------------- | ------------------------------------------------------------- |
| User Management  | `GET/POST /api/users`, `PUT /api/users/:id`, status/invite    |
| Compensation     | `GET/PUT /api/compensation` (defaults + per-person overrides) |
| Auth             | `GET /api/me` → current user (drives role scoping)            |
| Analytics / KPIs | see `docs/ROADMAP.md`                                         |

---

## Contract rules (please keep these)

1. **Field names and types stay exactly as above.** Renaming a field means
   touching the UI — coordinate first.
2. **Send enums as the exact label strings above.**
3. **Dates are ISO strings**, empty string when unset (not `null`).
4. **`phone` and `email` are strings** and may hold multiple comma-separated
   values. **`phone` is never a number type.**
5. **Amounts are plain numbers (Rupees) or `null`.** Never send "Discount %".
