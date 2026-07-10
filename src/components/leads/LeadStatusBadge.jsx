import { STATUS_BY_KEY } from "@/data/statuses";

// Colour-coded status pill. Colours are defined once in src/data/statuses.js.
export default function LeadStatusBadge({ statusKey }) {
  const status = STATUS_BY_KEY[statusKey];
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        Unknown
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${status.badge}`}
    >
      {status.label}
    </span>
  );
}
