// Renders a multi-select Services array as small chips inside a cell.
// Shows the first two, then a "+N" indicator when there are more.
export default function ServiceChips({ values, max = 2 }) {
  if (!values || values.length === 0) {
    return <span className="text-slate-400">—</span>;
  }
  const shown = values.slice(0, max);
  const extra = values.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((v) => (
        <span
          key={v}
          className="inline-flex items-center whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
        >
          {v}
        </span>
      ))}
      {extra > 0 ? (
        <span
          className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600"
          title={values.slice(max).join(", ")}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
