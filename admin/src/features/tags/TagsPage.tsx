import type { DataTableColumn } from "../../shared/ui/DataTable";
import type { Tag } from "../../shared/types/content";
import { apiPaths } from "../../shared/api/paths";
import {
  ResourceManager,
  type ManagedResource,
} from "../../shared/resources/ResourceManager";

type TagResource = Tag & ManagedResource;
const columns: DataTableColumn<TagResource>[] = [
  {
    key: "posts",
    header: "文章数",
    width: 100,
    cell: (item) => item.post_count ?? "—",
  },
];

export function TagsPage() {
  return (
    <ResourceManager<TagResource>
      title="文章标签"
      description="维护文章关键词与标签启用状态。"
      endpoint={apiPaths.tags}
      queryKey="tags"
      singular="标签"
      listKeys={["items", "tags", "tag"]}
      fields={[
        { name: "name", label: "标签名称", required: true },
        { name: "slug", label: "Slug", required: true },
        { name: "activate", label: "状态", type: "checkbox", full: true },
      ]}
      createInitial={{ name: "", slug: "", activate: true }}
      toForm={(item) => ({
        name: item.name,
        slug: item.slug ?? "",
        activate: item.activate,
      })}
      extraColumns={columns}
      impact={(item) =>
        item.post_count ? (
          <span>
            将影响 <strong>{item.post_count}</strong> 篇文章的标签关联。
          </span>
        ) : (
          "服务端未提供标签关联数。"
        )
      }
    />
  );
}
