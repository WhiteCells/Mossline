import type { DataTableColumn } from "../components/DataTable";
import type { Tag } from "../types/content";
import { endpoints } from "../types/content";
import { ApiRequirement } from "./common/ApiRequirement";
import {
  ResourceManager,
  type ManagedResource,
} from "./common/ResourceManager";

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
      endpoint={endpoints.tags}
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
      apiNote={
        <ApiRequirement>
          批量删除和删除影响确认依赖后端返回 post_count，并在 DELETE
          时执行事务化解除关联；接口文档目前未定义这部分契约。
        </ApiRequirement>
      }
    />
  );
}
