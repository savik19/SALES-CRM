import { statusBadgeClass, priorityBadgeClass } from "./statusStyles";

const base =
  "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

// Colour-coded Lead Status pill.
export function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <span className={`${base} ${statusBadgeClass(status)}`}>{status}</span>
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
