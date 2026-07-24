// ---------------------------------------------------------------------------
// Audit trail — an append-only log of who changed what, when. Every meaningful
// state change (lead status, deal stage, deal approval, amounts, owner, offering)
// writes an entry. The last 20 for an entity render in a collapsible "Activity"
// section on the Lead / Deal detail sidebars.
//
// Pure builders + reducers + a small in-memory mock store (same pattern as the
// commission ledger). The Laravel team needs this as a REAL table — see the
// prominent note in docs/API_CONTRACT.md.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AuditEntry
 * @property {string} id
 * @property {'lead'|'deal'} entityType
 * @property {string} entityId
 * @property {string} field        e.g. "status", "stage", "approval", "finalAmount", "ownerId", "offeringId"
 * @property {*} from
 * @property {*} to
 * @property {string} userId       who made the change
 * @property {string} role
 * @property {string} at           ISO timestamp
 * @property {string} [reason]
 */

// In-memory mock store. TODO(backend): GET /api/audit?entityType=&entityId=.
export const MOCK_AUDIT = [];

let _seq = 0;
function nextId() {
  _seq += 1;
  return `AUD-${_seq}`;
}

/**
 * Record one audit entry. Called by the data layer on every tracked change.
 * `actor` is { id, role }. Returns the stored entry (a copy).
 */
export function recordAudit({
  entityType,
  entityId,
  field,
  from,
  to,
  actor,
  reason = "",
}) {
  const entry = {
    id: nextId(),
    entityType,
    entityId,
    field,
    from: from ?? "",
    to: to ?? "",
    userId: actor?.id || "",
    role: actor?.role || "",
    at: new Date().toISOString(),
    reason,
  };
  MOCK_AUDIT.push(entry);
  return { ...entry };
}

// Diff a patch against the current record and record one entry per tracked field
// that actually changed. `fields` is an allow-list of {key, label} to watch.
export function recordChanges({
  entityType,
  entityId,
  before,
  patch,
  fields,
  actor,
  reason,
}) {
  const out = [];
  for (const { key, label } of fields) {
    if (!(key in patch)) continue;
    const from = before?.[key];
    const to = patch[key];
    if (from === to) continue;
    out.push(
      recordAudit({
        entityType,
        entityId,
        field: label || key,
        from,
        to,
        actor,
        reason,
      })
    );
  }
  return out;
}

// The most-recent `limit` entries for an entity, newest first.
export function auditFor(entityType, entityId, limit = 20) {
  return MOCK_AUDIT.filter(
    (e) => e.entityType === entityType && e.entityId === entityId
  )
    .slice()
    .reverse()
    .slice(0, limit);
}

export function getAudit() {
  return MOCK_AUDIT.map((e) => ({ ...e }));
}
