import {
  statusBadgeClass,
  priorityBadgeClass,
  stageBadgeClass,
  approvalBadgeClass,
} from "./statusStyles";
import { labelOf, isDerivedLeadStatus } from "@/lib/statuses";

const base =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

// Colour-coded Lead Status pill. `status` is a snake_case key. Derived statuses
// (in_discussion, won) render as outline badges with a small "auto" marker.
export function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const derived = isDerivedLeadStatus(status);
  return (
    <span className={`${base} ${statusBadgeClass(status)}`}>
      {labelOf(status)}
      {derived && (
        <span className="text-[9px] uppercase tracking-wide opacity-60">
          auto
        </span>
      )}
    </span>
  );
}

// Colour-coded Deal Stage pill.
export function StageBadge({ stage }) {
  if (!stage) return <span className="text-slate-400">—</span>;
  return (
    <span className={`${base} ${stageBadgeClass(stage)}`}>
      {labelOf(stage)}
    </span>
  );
}

// Colour-coded Deal Approval pill.
export function ApprovalBadge({ approval }) {
  if (!approval) return <span className="text-slate-400">—</span>;
  return (
    <span className={`${base} ${approvalBadgeClass(approval)}`}>
      {labelOf(approval)}
    </span>
  );
}

// Colour-coded Priority pill.
export function PriorityBadge({ priority }) {
  if (!priority) return <span className="text-slate-400">—</span>;
  return (
    <span className={`${base} ${priorityBadgeClass(priority)}`}>
      {priority}
    </span>
  );
}

export default StatusBadge;
