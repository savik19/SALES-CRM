# API Contract

> The contract between this frontend and the Laravel backend. Build these
> endpoints and return the shapes below, and the UI works with **zero component
> changes** — the frontend only ever calls the functions in
> [`src/lib/leadsApi.js`](../src/lib/leadsApi.js) and
> [`src/lib/dealsApi.js`](../src/lib/dealsApi.js).

**Base URL:** configured via `NEXT_PUBLIC_API_BASE_URL` (see [`.env.example`](../.env.example)).
All responses are JSON. All dates are ISO `YYYY-MM-DD` strings.

The canonical field definitions live in [`src/lib/types.js`](../src/lib/types.js)
as JSDoc typedefs (`Lead`, `Deal`), and the option lists (with exact values +
order) live in [`src/data/mockLeads.js`](../src/data/mockLeads.js). Keep them in
sync with this doc.

## Lead → Deal model (read this first)

The domain has **two** records:

- A **Lead** is a **prospect** — the company/contact you're working, its funnel
  status, and a non-binding list of the offerings it's **interested in**
  (`interestedOfferingIds`). No money lives on the lead.
- A **Deal** is the **unit of sale**: **one deal = one offering** (a single
  service or product). Money, stage, win-approval, commission and target all
  live on the deal. Once a prospect confirms, the DSC creates one deal **per
  offering** (`POST /api/deals`). A lead can hold **many** deals, now and in
  future (a repeat customer just gets new deals under the same lead).

So the Lead Table is a **prospect inbox**, the Pipeline is a **board of deals**,
and Approvals approves **individual deals**. Analytics keep the lead **funnel**
(prospecting activity) but take **won counts, values, target and commission from
deals**.

---

## How the frontend consumes this

| Frontend function                           | Endpoint                          | Used by                   |
| ------------------------------------------- | --------------------------------- | ------------------------- |
| `leadsApi.getLeads()`                       | `GET /api/leads`                  | Lead Table (prospects)    |
| `leadsApi.getLeadById(leadId)`              | `GET /api/leads/:id`              | Lead detail               |
| `leadsApi.updateLead(leadId, changes)`      | `PATCH /api/leads/:id`            | Edit / interest / status  |
| `dealsApi.getDeals()`                       | `GET /api/deals`                  | Pipeline, Approvals       |
| `dealsApi.getDealsByLead(leadId)`           | `GET /api/leads/:id/deals`        | Lead detail deals list    |
| `dealsApi.createDeal(deal)`                 | `POST /api/deals`                 | Create-deal (from a lead) |
| `dealsApi.updateDeal(dealId, changes)`      | `PATCH /api/deals/:id`            | Pipeline stage / fields   |
| `dealsApi.requestDealWin(dealId, payload)`  | `POST /api/deals/:id/request-win` | Win request (DSC)         |
| `dealsApi.approveDealWin(dealId, decision)` | `POST /api/deals/:id/approve-win` | Approve win (Admin)       |
| `dealsApi.rejectDealWin(dealId, decision)`  | `POST /api/deals/:id/reject-win`  | Reject win (Admin)        |

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

  // ---- Lead → Deal model ----
  "companyId": "co-sri-vari-textiles", // groups a company's leads/deals
  "interestedOfferingIds": ["svc-custom-software", "svc-website"], // non-binding
  // interest — offering ids the prospect is interested in; the DSC creates one
  // Deal per confirmed offering. See the Deal shape + endpoints below.
}
```

**Prospect record.** Under the Lead → Deal model the Lead is the **prospect**:
its `interestedOfferingIds` is a non-binding shortlist the DSC toggles in the lead
detail. When the prospect confirms, the DSC creates one **Deal** per offering
(`POST /api/deals`). All money/stage/approval/commission live on the **Deal**
(below), not the lead. `quotedAmount` / `closedAmount` remain on the lead only as
legacy rollups; new work reads them off deals.

> **Discount %** is **computed, never stored**:
> `(quotedAmount − closedAmount) / quotedAmount × 100`. The frontend derives it
> (on a deal from its own quoted/closed); do not send it.

### Deal (unit of sale — one offering)

A **Deal** is one confirmed offering under a Lead. Canonical typedef:
[`src/lib/types.js`](../src/lib/types.js) → `Deal`; seed derivation:
[`src/data/mockDeals.js`](../src/data/mockDeals.js).

```jsonc
{
  "dealId": "DEAL-8008-1", // string, primary key
  "leadId": "SCRIPT8008", // FK → Lead.leadId (the parent prospect)
  "companyId": "co-sri-vari-textiles", // denormalized company grouping
  "offeringId": "svc-custom-software", // FK → catalog offering (prices the deal)
  "ownerId": "u-anaya", // FK → TeamMember.id (the owning DSC)
  "dealStatus": "Open", // enum — DEAL_STATUSES (single-select, pipeline order)
  "quotedAmount": 210000, // number (Rupees) or null
  "closedAmount": null, // number (Rupees) agreed, or null until won
  "createdDate": "2026-07-08", // ISO date the deal was created
  "approvalStatus": "", // "" | "pending" | "approved" | "rejected"
  "approvalRequest": null, // snapshot sent for approval (see win flow)
  "approvalReason": "", // rejection reason, if any
  "wonApprovedDate": "", // ISO date the Admin approved the win; "" until then
  "approvalDecidedBy": "", // Admin id who decided
  "approvalDecidedDate": "", // ISO date of the decision
  "paymentStatus": "Pending", // "Pending" | "Partial" | "Paid"
  "receivedAmount": 0, // Rupees received so far
  "notes": "", // free text
}
```

Only deals with a `wonApprovedDate` in a won stage count as **won** for analytics
and commission. One deal carries exactly **one** `offeringId`, so its commission
is that offering's rule applied to `closedAmount` (no line items — see the
commission math below).

**Analytics dates.** The analytics are month-filtered and computed client-side
(`src/lib/analytics.js`). The **lead funnel** (prospecting) comes from lead dates
(`monthMetrics`); the **money metrics** come from deals (`dealMetrics`,
`mergedMetrics`). Return accurate dates on both records and the metrics follow:

Lead funnel (from leads):

- **Total leads** — all leads assigned to the person (all-time; not month-scoped).
- **Uncontacted** — leads with no `lastContactDate` yet (never contacted).
  All-time, **not** month-scoped (e.g. "500 uncontacted of 1000 total").
- **New assigned** — `assignedDate` in the selected month.
- **Contacted** — `lastContactDate` in the month.
- **Meeting scheduled / done** — leads currently at that status, worked
  (`lastContactDate` **or** `assignedDate`) in the month.
- **Follow-ups due** — `nextFollowUpDate` in the month.

Money (from deals, keyed by `ownerId`):

- **Deals won** — deals in a won stage whose `wonApprovedDate` is in the month.
- **Won value** — Σ `closedAmount` of those won deals.
- **Pipeline value** — Σ `quotedAmount` of currently-open deals (a snapshot; not
  won/lost/cancelled).

Earnings/target for the month use **deals won in the month** as the closed count
(`monthlyDealTarget`), and commission is priced per deal (below).

**Follow-up calendar filter.** The Lead Table has a date-range picker (a single
day = From == To, or an open-ended From/To) that filters rows by
`nextFollowUpDate`. It is a client-side view filter only — it does **not** scope
the analytics (those use the month selector). By default no range is set, so the
table shows **all** leads with the newest-assigned (`assignedDate` desc) on top.

**Pipeline is a board of deals.** The Pipeline (`/pipeline`) is a Kanban of
**deals**, one card per deal, grouped by `dealStatus` (in `DEAL_STATUSES` order).
Each card shows the company (from the parent lead), the offering, the owner and
the value. It is scoped to a **period** — a month (default = current, previous
months selectable) or a calendar range — where a deal is "in the period" if its
`createdDate` **or** `wonApprovedDate` falls in it. The board's overview stats are
deal-native: In pipeline (count), Open value (Σ `quotedAmount` of open deals),
Won (count), Won value (Σ `closedAmount`), and Pending (deals awaiting approval).
Filters are **Status** (deal stages) and **Owner** (DSC, managers only).

**Winning is the money event.** Moving a deal from a non-won stage **into** a won
stage does **not** set it directly — it opens a win request (`request-win`) so the
Admin can approve; the deal shows **pending** and locks until decided. Approving
sets `dealStatus: "Won"` + `wonApprovedDate`. Other stage moves patch the deal via
`PATCH /api/deals/:id`. Every move obeys the same permission model below: a deal is
draggable/restageable only by its owner (a DSC) or a manager on an unassigned/own
deal; a deal owned by another DSC (or anything while a manager is focused on a DSC)
is read-only.

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
- **Deal Status** (`DEAL_STATUSES`, single-select, pipeline order — the stages a
  single-offering Deal moves through): `Open, Proposal Sent, Negotiation, Won,
Project Started, Project Delivered, Closed, Lost, On Hold, Cancelled`
  - `Open` = entry stage · `Won` onward (`WON_DEAL_STATUSES`) counts as won ·
    Lost/Cancelled = reversals · On Hold = paused. `Won` is the approval-gated
    money event.
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

### Deal endpoints

The Pipeline, Approvals and the lead-detail deals list read/write deals through
`src/lib/dealsApi.js`. Enforce the same role/ownership model server-side.

- `GET /api/deals` → `Deal[]`. (Scope server-side per the logged-in user.)
- `GET /api/leads/:id/deals` → the `Deal[]` for one lead.
- `POST /api/deals` (deal owner) — create a deal for a lead. Body: a partial
  `Deal` `{ leadId, companyId, offeringId, ownerId, dealStatus:"Open",
quotedAmount, createdDate, notes? }`; the backend assigns `dealId` and defaults
  the rest. Enforce that the parent lead is the caller's (or a manager's) prospect.
  **201** → the created `Deal`.
- `PATCH /api/deals/:id` — partial `Deal` (stage, value, owner…), e.g.
  `{ "dealStatus": "Negotiation" }`. **200** → the updated `Deal`. Enforce the
  edit-permission model (owner or manager on own/unassigned).

### Deal win-approval flow (Won needs Admin approval)

A deal is credited as **won** only after the Admin approves the owner's request.
Moving a deal into a won stage on the board raises the request; `dealStatus` moves
to `Won` when the Admin approves. Three endpoints (`requestDealWin` /
`approveDealWin` / `rejectDealWin` in `dealsApi.js`):

- `POST /api/deals/:id/request-win` (deal owner) — Body `{ requestedBy,
requestedDate, quotedAmount, closedAmount, note? }`. One deal = one offering, so
  there are **no line items** — `closedAmount` is the single agreed amount;
  discount % = `(quoted − closed)/quoted`. Sets `approvalStatus: "pending"` and
  stores `approvalRequest`. Enforce owner-only.
- `POST /api/deals/:id/approve-win` (Admin) — Body `{ adminId, approvedDate }`.
  Applies the requested `quotedAmount`/`closedAmount`, sets `dealStatus: "Won"`,
  stamps `wonApprovedDate` (now credited for target + commission), and
  `approvalStatus: "approved"`.
- `POST /api/deals/:id/reject-win` (Admin) — Body `{ adminId, reason, decidedDate }`.
  Sets `approvalStatus: "rejected"` + `approvalReason`; the deal keeps its prior
  stage so the owner can revise and resubmit.

Approval fields on a Deal: `approvalStatus` (""/pending/approved/rejected),
`approvalRequest` (the snapshot above), `approvalReason`, `approvalDecidedBy`,
`approvalDecidedDate`, `wonApprovedDate`. Only deals with `wonApprovedDate` in a
won stage count as won in the analytics + commission. The Admin reviews pending
requests on the **Approvals** screen (`/approvals`).

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
  "deductionPct": 0, // statutory deduction (PF/tax) on gross → net; 0 for now
  "bdm": {
    "salaryMonthly": 40000, // Fixed part + performance pay
    "fixedPortionPct": 75, // fixed always paid; the rest is target-gated
    "monthlyDealTarget": 20, // company: deals won / month
  },
  "dsc": {
    "baseSalaryMonthly": 25000, // post-training total
    "trainingSalaryMonthly": 15000, // flat pay during training
    "trainingMonths": 2, // joinedMonthsAgo < this ⇒ in training
    "fixedPortionPct": 75,
    "monthlyDealTarget": 5, // each DSC: deals won / month
  },
  // Per-person overrides — only the keys present override that role default.
  "overrides": {
    "u-anaya": { "monthlyDealTarget": 8 }, // e.g. a DSC on a custom target
  },
}
```

> The target field was renamed `monthlyLeadTarget` → **`monthlyDealTarget`** with
> the Lead → Deal model (targets are now deals won, not leads). `compConfig.jsx`
> migrates the old key on load, but new configs should send `monthlyDealTarget`.

Earnings rule (see `personEarnings`): the Fixed portion is always paid; the
Performance Pay **and** commission are paid ONLY when the person meets their
monthly target (`dealsWon ≥ target`). A DSC within the training window gets the
flat training salary instead. Deductions apply to gross to get net take-home.
**Commission is not a flat %** — it's priced through the catalog (below): for the
person's deals won in the month, `commissionForDeals(deals, config, role)` prices
each deal's single offering and splits the total into **finalized** (past the
3-month hold → the payable part gated by the target) and **pending** (still in the
hold, shown but not yet paid). The BDM earns the BDM-rate override on **every**
team-won deal.

- `GET /api/compensation` → the config above.
- `PUT /api/compensation` — save the whole config (defaults + overrides). **200**.
- (Optional granular) `PUT /api/compensation/overrides/:userId` /
  `DELETE …/:userId` to set/clear one person's override.

### Commission catalog — Services & Products (Admin only)

The same config also carries the **commission catalog**: what the company sells
and what closing each thing pays. It is the single source of truth for commission
and lives under `config.services` / `config.products`. Each **offering** sets a
commission rule **per role** — a BDM earns a manager override on the same sale a
DSC closes (usually higher).

```jsonc
{
  // …salary config above…
  "services": [
    {
      "id": "svc-custom-software",
      "name": "Custom Software",
      "kind": "service",
      "dsc": { "type": "fixed", "value": 5000 }, // DSC gets a flat ₹5,000
      "bdm": { "type": "fixed", "value": 8000 }, // BDM override ₹8,000
      "active": true,
    },
  ],
  "products": [
    {
      "id": "prd-saas-subscription",
      "name": "SaaS Subscription",
      "kind": "product",
      "dsc": { "type": "percent", "value": 3 }, // DSC gets 3% of the plan value
      "bdm": { "type": "percent", "value": 5 }, // BDM override 5%
      "active": true,
    },
  ],
}
```

A commission **rule** is `{ type, value }`: `type: "fixed"` pays a flat ₹ amount
per sale (typical for services); `type: "percent"` pays `value`% of the sold
amount (typical for subscription products). Services default to fixed, products
to percent, but either can use either.

**Commission math** lives in `src/lib/commission.js` (pure, no React). A Deal is
**one offering** (`deal.offeringId` priced on `deal.closedAmount`):

- `singleDealCommission(deal, config, role)` — that role's rule for the deal's
  offering applied to its closed amount (falls back to quoted before it's won).
- `commissionStatus(deal, now)` — `none` (not an approved win) · `reversed`
  (cancelled/lost → ₹0) · `pending` (approved, still inside the `HOLD_MONTHS`-month
  quarterly hold) · `finalized` (hold elapsed → payable). Reads `deal.dealStatus`.
- `commissionForDeals(deals, config, role, now)` (in `analytics.js`) →
  `{ finalized, pending, total }` over a person's won deals.

Fixed vs percent, the per-role rates, and the hold window are all data, so tuning
them is an Admin edit, not a code change. (The older `dealCommission` /
`dealClosedValue` / `commissionRollup` line-item helpers remain for reference but
the single-offering deal uses `singleDealCommission`.)

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

The **same Focus switcher and permission model apply to the Pipeline** board of
deals: a manager can focus it on the team, their own deals, or one DSC
(read-only); a DSC sees only their own deals. A deal is scoped by its `ownerId`
and only deals the viewer may edit are draggable / restageable.

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

| Screen (roadmap) | Suggested endpoints                                                       |
| ---------------- | ------------------------------------------------------------------------- |
| Deals / Pipeline | `GET/POST /api/deals`, `PATCH /api/deals/:id`, win request/approve/reject |
| User Management  | `GET/POST /api/users`, `PUT /api/users/:id`, status/invite                |
| Compensation     | `GET/PUT /api/compensation` (defaults + per-person overrides)             |
| Auth             | `GET /api/me` → current user (drives role scoping)                        |
| Analytics / KPIs | see `docs/ROADMAP.md`                                                     |

---

## Contract rules (please keep these)

1. **Field names and types stay exactly as above.** Renaming a field means
   touching the UI — coordinate first.
2. **Send enums as the exact label strings above.**
3. **Dates are ISO strings**, empty string when unset (not `null`).
4. **`phone` and `email` are strings** and may hold multiple comma-separated
   values. **`phone` is never a number type.**
5. **Amounts are plain numbers (Rupees) or `null`.** Never send "Discount %".
