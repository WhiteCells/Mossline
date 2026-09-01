import { ExternalLink } from "lucide-react";
import type { DataTableColumn } from "../components/DataTable";
import type { FriendLink } from "../types/content";
import { endpoints } from "../types/content";
import {
  ResourceManager,
  type ManagedResource,
} from "./common/ResourceManager";

type FriendResource = FriendLink & ManagedResource;
const columns: DataTableColumn<FriendResource>[] = [
  {
    key: "uri",
    header: "网址",
    cell: (item) => (
      <a
        className="external-link"
        href={item.uri}
        target="_blank"
        rel="noreferrer"
      >
        {item.uri}
        <ExternalLink />
      </a>
    ),
  },
  {
    key: "group",
    header: "分组",
    hideBelow: "tablet",
    cell: (item) => item.group || "默认",
  },
];

export function FriendsPage() {
  return (
    <ResourceManager<FriendResource>
      title="友链管理"
      description="维护相邻站点、展示分组和排序。"
      endpoint={endpoints.friends}
      queryKey="friends"
      singular="友链"
      listKeys={["items", "friends", "links"]}
      fields={[
        { name: "name", label: "站点名称", required: true },
        {
          name: "uri",
          label: "网址",
          type: "url",
          required: true,
          validate: (value) => {
            try {
              new URL(String(value));
              return undefined;
            } catch {
              return "请输入包含 http:// 或 https:// 的有效网址";
            }
          },
        },
        {
          name: "logo",
          label: "Logo 地址",
          type: "url",
          hint: "后端附件接口补齐后可替换为附件选择器。",
        },
        { name: "group", label: "分组" },
        { name: "desc", label: "描述", type: "textarea", full: true },
        { name: "sort", label: "排序", type: "number" },
        { name: "activate", label: "状态", type: "checkbox" },
      ]}
      createInitial={{
        name: "",
        uri: "",
        logo: "",
        group: "",
        desc: "",
        sort: 0,
        activate: true,
      }}
      toForm={(item) => ({
        name: item.name,
        uri: item.uri,
        logo: item.logo ?? "",
        group: item.group ?? "",
        desc: item.desc ?? "",
        sort: item.sort ?? 0,
        activate: item.activate,
      })}
      extraColumns={columns}
    />
  );
}
