import type { DataTableColumn } from "../components/DataTable";
import type { Category } from "../types/content";
import { endpoints } from "../types/content";
import { ApiRequirement } from "./common/ApiRequirement";
import {
  ResourceManager,
  type ManagedResource,
} from "./common/ResourceManager";

type CategoryResource = Category & ManagedResource;

const columns: DataTableColumn<CategoryResource>[] = [
  {
    key: "parent",
    header: "上级分类",
    hideBelow: "tablet",
    cell: (item) => (item.parent_id ? String(item.parent_id) : "顶级分类"),
  },
  {
    key: "posts",
    header: "文章数",
    width: 90,
    cell: (item) => item.post_count ?? "—",
  },
];

export function CategoriesPage() {
  return (
    <ResourceManager<CategoryResource>
      title="文章分类"
      description="组织文章目录，调整顺序与展示状态。"
      endpoint={endpoints.categories}
      queryKey="categories"
      singular="分类"
      listKeys={["items", "categories", "category"]}
      fields={[
        { name: "name", label: "分类名称", required: true },
        {
          name: "slug",
          label: "Slug",
          required: true,
          hint: "建议仅使用小写字母、数字和连字符。",
        },
        {
          name: "parent_id",
          label: "上级分类",
          placeholder: "留空表示顶级分类",
          hint: "当前 API 文档尚未定义分类树接口。",
        },
        { name: "sort", label: "排序", type: "number" },
        { name: "activate", label: "状态", type: "checkbox", full: true },
      ]}
      createInitial={{
        name: "",
        slug: "",
        parent_id: "",
        sort: 0,
        activate: true,
      }}
      toForm={(item) => ({
        name: item.name,
        slug: item.slug ?? "",
        parent_id: item.parent_id ? String(item.parent_id) : "",
        sort: item.sort ?? 0,
        activate: item.activate,
      })}
      extraColumns={columns}
      impact={(item) =>
        item.post_count ? (
          <span>
            该分类关联 <strong>{item.post_count}</strong>{" "}
            篇文章。后端必须要求迁移分类或明确解除关联后再删除。
          </span>
        ) : (
          "服务端未提供关联文章数量，请谨慎删除。"
        )
      }
      apiNote={
        <ApiRequirement>
          父子分类、拖拽排序和删除前关联迁移需要后端补充
          parent_id、sort、post_count
          以及关联处理规则；当前界面会展示已有字段，但不会猜测处理结果。
        </ApiRequirement>
      }
    />
  );
}
