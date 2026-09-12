import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Pin this column while the table scrolls horizontally (use on the first column). */
  sticky?: boolean;
}

const ALIGN = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * Data table that scrolls horizontally inside its own container, so wide
 * tables never make the page scroll sideways on a phone.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  footnote,
  emptyMessage = "Nothing to show",
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  caption?: ReactNode;
  footnote?: ReactNode;
  emptyMessage?: string;
  rowClassName?: (row: T, index: number) => string | undefined;
}) {
  return (
    <div>
      <div className="table-scroll">
        <table className="data-table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={classNames(
                    ALIGN[column.align ?? "left"],
                    column.sticky && "sticky left-0 z-10 bg-surface",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-ink-3">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={rowKey(row, index)} className={rowClassName?.(row, index)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={classNames(
                        ALIGN[column.align ?? "left"],
                        column.sticky && "sticky left-0 z-10 bg-surface font-medium text-ink",
                        column.className,
                      )}
                    >
                      {column.render ? column.render(row, index) : ((row as Record<string, ReactNode>)[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footnote ? <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{footnote}</p> : null}
    </div>
  );
}

/** Hint shown above wide tables on small screens. */
export function ScrollHint({ children = "Scroll sideways to see every column" }: { children?: ReactNode }) {
  return <p className="mb-2 text-[11.5px] text-ink-4 sm:hidden">{children}</p>;
}
