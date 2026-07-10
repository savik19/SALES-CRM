"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// App navigation. Order mirrors the Build Brief §3 build sequence.
// Screens not built yet are marked `soon` so the nav shows the full roadmap
// without pretending they're ready.
const NAV = [
  { href: "/leads", label: "Lead Table", icon: "📋", soon: false },
  { href: "/statuses", label: "Pipeline", icon: "🔀", soon: true },
  { href: "/analytics", label: "Analytics", icon: "📊", soon: true },
  { href: "/kpis", label: "KPIs", icon: "🎯", soon: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          SG
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">ScriptGuru</div>
          <div className="text-xs text-slate-500">Sales CRM</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const base =
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
          if (item.soon) {
            return (
              <div
                key={item.href}
                className={`${base} cursor-not-allowed text-slate-400`}
                title="Coming next in the build sequence"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Soon
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${base} ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] leading-relaxed text-slate-400">
        Frontend build · mock data.
        <br />
        APIs wired by the Laravel team.
      </div>
    </aside>
  );
}
