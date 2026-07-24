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
  status, and the DSC's knowledge tags: **Services Pitched / Services Interested /
  Services Onboarded**. **No money lives on the lead** (quoted/closed/discount/
  lost-reason all live on the Deal). `servicesInterested` is what a deal can be
  created for.
- A **Deal** is the **unit of sale**: **one deal = one offering** (a single
  service or product). Money, stage, win-approval, commission and target all
  live on the deal. Once a prospect confirms, the DSC creates one deal **per
  offering** (`POST /api/deals`) — the create dropdown is the lead's
  `servicesInterested`. A lead can hold **many** deals, now and in future (a
  repeat customer just gets new deals under the same lead).

So the Lead Table (`/leads`) has a **Leads | Deals** toggle: the Lead view is a
**prospect inbox** (each row expands to the lead's deals); the Deal
view is a **table of every deal** with its own status/money filters. The Pipeline
(`/pipeline`) is the same deals as a **Kanban board**. Approvals groups pending
deals **under their lead**. Analytics keep the lead **funnel** (prospecting
activity) but take **won counts, values, target and commission from deals**.

**The approval gate is "Project Started".** The DSC moves a deal freely up to
**"Won"** (the client has agreed). Advancing to **"Project Started"** requires the
**finalized amount** and **Admin approval** — that is the money event. Only an
**approved** deal (Project Started onward, carrying a `wonApprovedDate`) is
credited toward target + commission; a deal merely at "Won" is not.

---

## How the frontend consumes this

| Frontend function                           | Endpoint                          | Used by                   |
| ------------------------------------------- | --------------------------------- | ------------------------- |
| `leadsApi.getLeads()`                       | `GET /api/leads`                  | Lead Table (prospects)    |
| `leadsApi.getLeadById(leadId)`              | `GET /api/leads/:id`              | Lead detail               |
| `leadsApi.updateLead(leadId, changes)`      | `PATCH /api/leads/:id`            | Edit fields / status      |
| `dealsApi.getDeals()`                       | `GET /api/deals`                  | Pipeline, Approvals       |
| `dealsApi.getDealsByLead(leadId)`           | `GET /api/leads/:id/deals`        | Lead detail deals list    |
| `dealsApi.createDeal(deal)`                 | `POST /api/deals`                 | Create-deal (from a lead) |
| `dealsApi.updateDeal(dealId, changes)`      | `PATCH /api/deals/:id`            | Pipeline stage / fields   |
| `dealsApi.requestApproval(dealId, …)`       | `POST /api/deals/:id/request-approval` | Request approval (owner) |
| `dealsApi.approveDeal(dealId, …)`           | `POST /api/deals/:id/approve`     | Approve (Admin)           |
| `dealsApi.rejectDeal(dealId, …)`            | `POST /api/deals/:id/reject`      | Reject (Admin)            |
| `dealsApi.deliverDeal(dealId, …)`           | `POST /api/deals/:id/deliver`     | Set delivered (Admin)     |
| `dealsApi.reverseDeal(dealId, …)`           | `POST /api/deals/:id/reverse`     | Reverse (Admin)           |

The frontend passes **no auth today**. When auth exists, add it in the `apiGet`
helper / `fetch` calls (one spot) — e.g. a Sanctum cookie (`credentials: "include"`)
or an `Authorization` header.

---

## Object shapes

### Lead (prospect schema)

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
  "leadStatus": "interested", // enum — LEAD_STATUS (see below). Store a MANUAL
  // value only; `in_discussion` / `won` are SERVER-DERIVED and must NEVER be
  // accepted on write. `lost` is gated (zero approved deals).
  "priority": "High", // enum — PRIORITIES (single-select)
  "assignedDscId": "u-anaya", // string → TeamMember.id
  "attemptCount": 5, // number
  "servicesPitched": ["Website Development", "AI Tools"], // multi-select, subset of SERVICES
  "servicesInterested": ["Website Development"], // multi-select — drives deal creation
  "servicesOnboarded": [], // multi-select
  "lastContactDate": "2026-07-09", // ISO date or ""
  "nextFollowUpDate": "2026-07-14", // ISO date or ""
  "assignedDate": "2026-07-02", // ISO date the lead was assigned to its DSC
  "closedDate": "2026-07-11", // ISO date a won lead was closed; "" otherwise
  "notes": "Wants a revised quote…", // long text
  "companyId": "co-sri-vari-textiles", // groups a company's leads/deals
  // NOTE: no quotedAmount/closedAmount/discount/lostReason — money lives on the
  // Deal (below). The three service arrays are knowledge tags; servicesInterested
  // is the list a deal can be created for.
}
```

**Prospect record.** Under the Lead → Deal model the Lead is the **prospect** and
carries **no money**. The DSC tags what was pitched / what the lead is interested
in / what's onboarded (the three service arrays). When the prospect confirms, the
DSC creates one **Deal** per offering (`POST /api/deals`) — the create dropdown is
the lead's `servicesInterested`. All money/stage/approval/commission live on the
**Deal**
(below), not the lead.

> **Discount %** is **computed, never stored**:
> `(quotedAmount − finalAmount) / quotedAmount × 100`. The frontend derives it
> (on a deal from its own quoted/final); do not send it.

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
  "stage": "open", // enum — DEAL_STAGE (independent of approval)
  "approval": "not_requested", // enum — DEAL_APPROVAL (independent of stage)
  "quotedAmount": 210000, // number (Rupees) PITCHED, or null
  "finalAmount": null, // number (Rupees) FINALIZED/agreed; the commission base
  "lostReason": "", // enum — LOST_REASONS; only when stage = "cancelled"
  "createdDate": "2026-07-08", // ISO date the deal was created
  "approvalRequest": null, // snapshot captured at request time (see flow)
  "approvalReason": "", // rejection / reversal reason, if any
  "wonApprovedDate": "", // ISO date the Admin approved; "" until then
  "deliveredDate": "", // ISO date the Admin set project_delivered; "" until then
  "approvalDecidedBy": "", // Admin id who decided
  "approvalDecidedDate": "", // ISO date of the decision
  "paymentStatus": "Pending", // "Pending" | "Partial" | "Paid"
  "receivedAmount": 0, // Rupees received so far
  "notes": "", // free text
}
```

`stage` and `approval` are **independent** (do not derive one from the other
beyond the explicit approval transitions). A deal counts as **won** for analytics
and commission once `approval === "approved"`. One deal carries exactly **one**
`offeringId`, so its commission is that offering's rule applied to `finalAmount`
(never `quotedAmount`; no line items — see the commission math below).

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

- **Deals won** — deals with `approval === "approved"` whose `wonApprovedDate` is
  in the month.
- **Won value** — Σ `finalAmount` of those won deals.
- **Pipeline value** — Σ `finalAmount ?? quotedAmount` of currently-live deals (a
  snapshot; not approved/cancelled/reversed).

**Commission — Earned (held) vs Payable.** On approval the owner's commission
**accrues** (Earned, held); when the project is **delivered** it **releases**
(Payable); a **reverse** claws it back (negative entry). The analytics show both
figures separately for DSC and BDM.

Earnings/target for the month use **deals won in the month** as the closed count
(`monthlyDealTarget`), and commission is priced per deal (below).

**Follow-up calendar filter.** The Lead Table has a date-range picker (a single
day = From == To, or an open-ended From/To) that filters rows by
`nextFollowUpDate`. It is a client-side view filter only — it does **not** scope
the analytics (those use the month selector). By default no range is set, so the
table shows **all** leads with the newest-assigned (`assignedDate` desc) on top.

**Pipeline is a board of deals.** The Pipeline (`/pipeline`) is a Kanban of
**deals**, one card per deal, grouped by `stage`. The columns are the **4
user-controllable** stages (Open · Proposal Sent · Negotiation · Cancelled) plus
two **read-only** trailing columns (Project Started · Project Delivered) that are
set by Admin approval — dropping into them is rejected with a toast. Pending deals
are locked (not draggable). It is scoped to a **period** where a deal is "in the
period" if its `createdDate` **or** `wonApprovedDate` falls in it. Filters are
**Stage**, **Approval** and **Owner** (managers only).

**Starting the project is the money event.** A deal advances to `project_started`
only via the approval flow (`request-approval` → Admin `approve`), never a direct
stage set. The owner sets `open → proposal_sent → negotiation` freely; the
**pitched (`quotedAmount`) and finalized (`finalAmount`) amounts are editable**
(discount derived) while `approval ∈ {not_requested, rejected}`, then locked. Stage
moves patch the deal via `PATCH /api/deals/:id`. Every move obeys the
stage-editability matrix + permission model: editable only by the owner (DSC) or a
manager on an own/unassigned deal.

**Deals view + Approvals grouping.** The `/leads` Deal view lists every deal as a
table row (company, offering, type, owner, stage, pitched, final, discount,
approval, payment, created) with Stage / Owner / Type / Approval filters — the
tabular counterpart to the Kanban. **Approvals** (`/approvals`) groups the pending
deals **under their lead** (Pending tab) with pricing + commission-to-credit, and
a second **Approved** tab with Set Delivered / Reverse.

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

- **Lead Status** (`LEAD_STATUS`, single-select, 10, funnel order): `new,
attempted, contacted, details_shared, interested, meeting_scheduled,
meeting_done, in_discussion, won, lost`
  - 1–7 = **manual** · `in_discussion` and `won` are **SERVER-DERIVED** from the
    lead's deals and must **never** be accepted on write (`deriveLeadStatus`):
    `won` if any deal is `approved` (one-way door); else `in_discussion` if any
    deal is live (open/proposal_sent/negotiation). `lost` is manual but settable
    **only** when the lead has zero approved deals.
- **Deal Stage** (`DEAL_STAGE`, single-select): `open, proposal_sent,
negotiation, project_started, project_delivered, cancelled`
  - `open/proposal_sent/negotiation` = user-controlled · `project_started` is set
    by the **system on approval** · `project_delivered` is Admin-only ·
    `cancelled` is terminal.
- **Deal Approval** (`DEAL_APPROVAL`, single-select): `not_requested, pending,
approved, rejected, reversed`
  - `approved` credits the deal (target + commission) · `reversed` claws it back.
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
  `Deal` `{ leadId, companyId, offeringId, ownerId, stage:"open", quotedAmount,
finalAmount?, createdDate, notes? }`; the backend assigns `dealId`, defaults
  `approval:"not_requested"` and the rest. The `offeringId` must be one of the
  lead's **active** `servicesInterested` offerings. **201** → the created `Deal`.
- `PATCH /api/deals/:id` — partial `Deal` (stage, amounts, owner, offering), e.g.
  `{ "stage": "negotiation" }`. **200** → updated `Deal`. **Never** set `approval`
  here — use the flow endpoints below. Enforce the stage-editability matrix:
  editable stages are `{open, proposal_sent, negotiation, cancelled}` only when
  `approval ∈ {not_requested, rejected}`; `pending` is locked; an `approved` deal
  is Admin-only (`project_delivered`/`cancelled` via deliver/reverse); `reversed`
  is terminal.

### Deal approval flow (the money event)

`approval` is the money control, separate from `stage`. Five endpoints
(`requestApproval` / `approveDeal` / `rejectDeal` / `deliverDeal` / `reverseDeal`
in `dealsApi.js`). All writes to the commission ledger + audit trail happen
**server-side** here — the UI never writes them.

- `POST /api/deals/:id/request-approval` (deal owner) — Body `{ requestedBy,
requestedDate, quotedAmount, finalAmount, note? }`. Preconditions (re-validate
  server-side): `stage ∈ {open, proposal_sent, negotiation}`, `approval ∈
{not_requested, rejected}`, `finalAmount > 0`, an owner and an `offeringId`. Sets
  `approval: "pending"` (stage frozen), stores `approvalRequest`. Owner-only.
- `POST /api/deals/:id/withdraw-approval` (owner) — pending → `not_requested`.
- `POST /api/deals/:id/approve` (**Admin only**) — atomically: `approval:
"approved"`, `stage: "project_started"`, stamp `wonApprovedDate`, write a
  commission **accrual** ledger entry for `ownerId`, append an audit entry.
- `POST /api/deals/:id/reject` (**Admin only**) — Body `{ adminId, reason }`
  (reason **required**). `approval: "rejected"` + `approvalReason`; stage
  unchanged so the owner can revise and resubmit.
- `POST /api/deals/:id/deliver` (**Admin only**, on an approved deal) — `stage:
"project_delivered"`, stamp `deliveredDate`, write a commission **release** entry.
- `POST /api/deals/:id/reverse` (**Admin only**, on an approved deal) — Body
  `{ adminId, reason }` (required). Atomically `approval: "reversed"` **and**
  `stage: "cancelled"`, write a **negative** (reversal) ledger entry.

**BDM cannot approve** — approval is the money control and the BDM is compensated
on team sales (conflict of interest). The BDM sees the pending queue read-only.
The Admin acts on the **Approvals** screen (`/approvals`): a Pending tab grouped
by lead (with the commission-to-credit and a discount-over-20% flag, plus bulk
approve) and an Approved tab (Set Delivered / Reverse).

### Commission ledger + audit trail (new tables — please build)

- `GET /api/commission-ledger?userId=&dealId=` → `CommissionEntry[]` (see
  `types.js`). **Append-only** — entries are written only by the approve/deliver/
  reverse endpoints above, never by the client. Each entry snapshots the comp
  rule (`ruleSnapshot`) at that moment so a later config edit never rewrites
  history. `commissionReleaseTrigger` (`project_started` | `project_delivered`,
  default the latter) decides when an accrual becomes payable.
- `GET /api/audit?entityType=&entityId=` → `AuditEntry[]` (see `types.js`) — the
  last N changes to a lead or deal (status/stage/approval/amount/owner/offering),
  rendered in the Activity section of both detail sidebars.

### Offering catalog (compensation)

Offerings live in the compensation config (`GET/PUT /api/compensation`), each
`{ id, name, kind, dsc:{type,value}, bdm:{type,value}, active }`. Commission =
`percent → finalAmount*value/100`, `fixed → value`, always from `finalAmount`.
Deactivating an offering (`active:false`) must **not** break existing deals —
filter inactive ones out of the **create** dropdown only.

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
**one offering** (`deal.offeringId` priced on `deal.finalAmount`, never the quote):

- `singleDealCommission(deal, config, role)` — that role's rule for the deal's
  offering applied to `finalAmount`.
- `dealCommissionSplit(deal, config, role)` → `{ held, payable }` under the
  config's `commissionReleaseTrigger`: an approved deal accrues **held** until the
  stage reaches `project_delivered` (or the trigger is `project_started`), when it
  becomes **payable**; a reversed/cancelled deal contributes ₹0.
- The append-only **ledger** (`commissionLedger.js`) is the record of truth: an
  accrual on approve, a release on deliver, a negative reversal on reverse — each
  snapshotting the rule so history never changes.

Fixed vs percent, the per-role rates, and the release trigger are all data, so
tuning them is an Admin edit, not a code change.

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
Priority, Last Contact Date, Next Follow-up Date, Notes. Columns 18–22 are
CRM-only and filled in later. Duplicate detection matches on Phone OR Email OR
(Company + City).

## Endpoints to add as those screens are built

| Screen (roadmap) | Suggested endpoints                                                       |
| ---------------- | ------------------------------------------------------------------------- |
| Deals / Pipeline | `GET/POST /api/deals`, `PATCH /api/deals/:id`, request-approval / approve / reject / deliver / reverse |
| Ledger / Audit   | `GET /api/commission-ledger`, `GET /api/audit` |
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
