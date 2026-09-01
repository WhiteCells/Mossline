import type { DataTableColumn } from "../components/DataTable";
import type { Moment } from "../types/content";
import { endpoints } from "../types/content";
import { formatDate } from "../lib/format";
import { StatusBadge } from "./common/status";
import { ContentListPage } from "./common/ContentListPage";

const columns: DataTableColumn<Moment>[] = [
  {
    key: "content",
    header: "内容",
    cell: (item) => (
      <div className="table-primary">
        <strong>
          {item.content.replace(/[#>*_`[\]]/g, "").slice(0, 70) || "无正文"}
        </strong>
        <small>{formatDate(item.published_at || item.created_at)}</small>
      </div>
    ),
  },
  {
    key: "visibility",
    header: "可见性",
    cell: (item) => <StatusBadge status={item.visibility} />,
  },
  {
    key: "status",
    header: "状态",
    cell: (item) => <StatusBadge status={item.status} />,
  },
  {
    key: "updated_at",
    header: "更新时间",
    sortable: true,
    hideBelow: "tablet",
    cell: (item) => formatDate(item.updated_at),
  },
];

export function MomentsPage() {
  return (
    <ContentListPage<Moment>
      title="动态管理"
      description="管理片刻动态的内容、可见性和发布状态。"
      singular="动态"
      endpoint={endpoints.moments}
      queryKey="moments"
      listKeys={["items", "moments"]}
      columns={columns}
      newPath="/moments/new"
      editPath={(item) => `/moments/${item.id}/edit`}
    />
  );
}
