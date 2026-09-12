"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, SECONDARY_NAV } from "./nav";
import { IconSparkline } from "@/components/ui/icon";
import { classNames } from "@/lib/format";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation: a fixed dark rail. Hidden below the lg breakpoint. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-y-auto bg-navy px-4 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/90 text-white">
          <IconSparkline size={18} />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight">StockPredict</span>
          <span className="block text-[11px] font-medium text-white/55">NIFTY 50 · direction</span>
        </span>
      </Link>

      <nav aria-label="Main" className="mt-7 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={classNames(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                active ? "bg-accent text-white shadow-[var(--shadow-pop)]" : "text-white/65 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon size={18} className={active ? "text-white" : "text-white/55 group-hover:text-white"} />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col gap-1 pt-6">
          {SECONDARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={classNames(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                  active ? "bg-white/12 text-white" : "text-white/55 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[11px] leading-relaxed text-white/50">
            Every figure on this dashboard is read from the executed notebook&rsquo;s
            <code className="mx-1 rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] text-white/70">
              results/dashboard.json
            </code>
            . Research project, not investment advice.
          </p>
        </div>
      </nav>
    </aside>
  );
}
