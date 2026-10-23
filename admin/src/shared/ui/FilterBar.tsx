import { Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  actions?: ReactNode;
  activeFilterCount?: number;
  onReset?: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "搜索…",
  children,
  actions,
  activeFilterCount = 0,
  onReset,
}: FilterBarProps) {
  return (
    <div className="ui-filter-bar" role="search">
      <div className="ui-filter-bar__fields">
        {onSearchChange && (
          <div className="ui-search-field">
            <Search aria-hidden="true" />
            <input
              type="search"
              aria-label="搜索"
              value={search ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
            />
            {search && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => onSearchChange("")}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {children && (
          <div className="ui-filter-bar__filters">
            <SlidersHorizontal aria-hidden="true" />
            {children}
          </div>
        )}
        {activeFilterCount > 0 && onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            重置筛选 ({activeFilterCount})
          </Button>
        )}
      </div>
      {actions && <div className="ui-filter-bar__actions">{actions}</div>}
    </div>
  );
}
