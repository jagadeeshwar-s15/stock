"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemFor, SECONDARY_NAV } from "./nav";
import { IconMethod, IconSparkline } from "@/components/ui/icon";

/** Compact header for small screens; the desktop rail replaces it from lg up. */
export function MobileHeader() {
  const pathname = usePathname();
  const current = navItemFor(pathname);
  const methodology = SECONDARY_NAV[0];
  const onMethodology = pathname.startsWith(methodology.href);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur-sm lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white">
            <IconSparkline size={16} />
          </span>
          <span className="leading-tight">
            <span className="block text-[13.5px] font-bold tracking-tight text-ink">StockPredict</span>
            <span className="block text-[11px] font-medium text-ink-3">{current?.label ?? "Dashboard"}</span>
          </span>
        </Link>
        <Link
          href={methodology.href}
          aria-current={onMethodology ? "page" : undefined}
          aria-label="Methodology"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-2"
        >
          <IconMethod size={17} />
        </Link>
      </div>
    </header>
  );
}
