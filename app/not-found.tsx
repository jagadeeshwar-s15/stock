import Link from "next/link";

import { NAV_ITEMS } from "@/components/shell/nav";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-xl px-5 py-9 text-center sm:px-8">
      <p className="label-caps">404</p>
      <h1 className="mt-2 text-[19px] font-bold tracking-tight text-ink">Page not found</h1>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-2">
        This dashboard has five sections. Pick one below to continue.
      </p>
      <ul className="mx-auto mt-5 flex max-w-sm flex-col gap-2 text-left">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-subtle"
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
