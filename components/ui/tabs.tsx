"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { classNames } from "@/lib/format";

export interface TabItem {
  id: string;
  label: string;
  /** Server-rendered content passed in as a prop. */
  content: ReactNode;
}

/**
 * Accessible tabs. Every panel stays mounted (hidden with the `hidden`
 * attribute), so the content is present for search and assistive technology
 * and switching costs nothing.
 */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const baseId = useId();
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.id === active);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    const id = items[next].id;
    setActive(id);
    buttons.current[id]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="table-scroll flex gap-1 rounded-xl bg-subtle p-1"
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(element) => {
                buttons.current[item.id] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-controls={`${baseId}-panel-${item.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={classNames(
                "min-h-[36px] whitespace-nowrap rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                selected ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-3 hover:text-ink-2",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          className="pt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
