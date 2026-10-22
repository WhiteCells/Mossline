import type { CSSProperties, Key, ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "./States";

export type SortDirection = "asc" | "desc";

export interface TableSort {
  key: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: "left" | "center" | "right";
  hideBelow?: "tablet" | "desktop";
  headerLabel?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => Key;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  sort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  selectedKeys?: Set<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  caption?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error,
  onRetry,
  sort,
  onSortChange,
  selectedKeys,
  onSelectionChange,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
  caption,
}: DataTableProps<T>) {
  if (loading)
    return (
      <div className="ui-table-card">
        <LoadingState />
      </div>
    );
  if (error)
    return (
      <div className="ui-table-card">
        <ErrorState description={error} onRetry={onRetry} />
      </div>
    );
  if (data.length === 0) {
    return (
      <div className="ui-table-card">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  const keys = data.map(rowKey);
  const allSelected = Boolean(
    selectedKeys && keys.every((key) => selectedKeys.has(key)),
  );
  const partiallySelected = Boolean(
    selectedKeys && !allSelected && keys.some((key) => selectedKeys.has(key)),
  );

  const toggleAll = () => {
    if (!selectedKeys || !onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (allSelected) keys.forEach((key) => next.delete(key));
    else keys.forEach((key) => next.add(key));
    onSelectionChange(next);
  };

  const toggleRow = (key: Key) => {
    if (!selectedKeys || !onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    const direction: SortDirection =
      sort?.key === column.key && sort.direction === "asc" ? "desc" : "asc";
    onSortChange({ key: column.key, direction });
  };

  return (
    <div className="ui-table-card">
      <div className="ui-table-scroll">
        <table className="ui-table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selectedKeys && onSelectionChange && (
                <th className="ui-table__selection">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = partiallySelected;
                    }}
                    onChange={toggleAll}
                    aria-label={allSelected ? "取消选择当前页" : "选择当前页"}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`ui-table__${column.align ?? "left"} ${column.hideBelow ? `ui-table__hide-${column.hideBelow}` : ""}`}
                  style={{ width: column.width } as CSSProperties}
                  scope="col"
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="ui-table__sort"
                      onClick={() => handleSort(column)}
                    >
                      {column.header}
                      {sort?.key !== column.key ? (
                        <ArrowUpDown aria-hidden="true" />
                      ) : sort.direction === "asc" ? (
                        <ArrowUp aria-hidden="true" />
                      ) : (
                        <ArrowDown aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const key = rowKey(row);
              const selected = Boolean(selectedKeys?.has(key));
              return (
                <tr
                  key={key}
                  className={`${selected ? "ui-table__row--selected" : ""} ${onRowClick ? "ui-table__row--clickable" : ""}`.trim()}
                  onClick={
                    onRowClick
                      ? (event) => {
                          const target = event.target as HTMLElement;
                          if (
                            !target.closest(
                              'button, a, input, select, textarea, [role="button"]',
                            )
                          )
                            onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {selectedKeys && onSelectionChange && (
                    <td
                      className="ui-table__selection"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(key)}
                        aria-label={`选择第 ${index + 1} 行`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`ui-table__${column.align ?? "left"} ${column.hideBelow ? `ui-table__hide-${column.hideBelow}` : ""}`}
                      data-label={
                        column.headerLabel ??
                        (typeof column.header === "string"
                          ? column.header
                          : undefined)
                      }
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
