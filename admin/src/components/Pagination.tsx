import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

function getVisiblePages(
  current: number,
  count: number,
): Array<number | "ellipsis"> {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
  const pages: Array<number | "ellipsis"> = [1];
  if (current > 4) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (current < count - 3) pages.push("ellipsis");
  pages.push(count);
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const first = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const last = Math.min(safePage * pageSize, total);

  return (
    <div className="ui-pagination">
      <div className="ui-pagination__meta">
        <span>
          显示 {first}–{last}，共 {total} 项
        </span>
        {onPageSizeChange && (
          <label>
            每页
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <nav className="ui-pagination__pages" aria-label="分页">
        <Button
          variant="outline"
          size="icon"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="上一页"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        {getVisiblePages(safePage, pageCount).map((item, index) =>
          item === "ellipsis" ? (
            <span
              className="ui-pagination__ellipsis"
              aria-hidden="true"
              key={`ellipsis-${index}`}
            >
              …
            </span>
          ) : (
            <Button
              variant={item === safePage ? "primary" : "outline"}
              size="icon"
              key={item}
              aria-label={`第 ${item} 页`}
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="下一页"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
