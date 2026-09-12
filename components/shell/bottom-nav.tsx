"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "./nav";
import { classNames } from "@/lib/format";

/** Mobile navigation: a fixed bottom bar with touch-sized targets. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={classNames(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10.5px] font-semibold transition-colors",
                  active ? "text-accent" : "text-ink-3",
                )}
              >
                <span
                  className={classNames(
                    "flex h-7 w-10 items-center justify-center rounded-full transition-colors",
                    active ? "bg-accent-soft" : "bg-transparent",
                  )}
                >
                  <Icon size={18} />
                </span>
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
