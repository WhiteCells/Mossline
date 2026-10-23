import { lazy, Suspense } from "react";
import {
  Activity,
  FileImage,
  FileText,
  FolderTree,
  Gauge,
  Info,
  Link2,
  Palette,
  Tags,
  Users,
  Zap,
} from "lucide-react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { RequireAuth } from "../features/auth/RequireAuth";
import { LoadingState } from "../shared/ui/States";
import { useToast } from "../shared/ui/Toast";
import { AdminLayout, type AdminNavGroup } from "./layouts/AdminLayout";
import { LoginPage } from "../features/auth/LoginPage";

const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const UsersPage = lazy(() =>
  import("../features/users/UsersPage").then((module) => ({
    default: module.UsersPage,
  })),
);
const PostsPage = lazy(() =>
  import("../features/posts/PostsPage").then((module) => ({
    default: module.PostsPage,
  })),
);
const PostEditorPage = lazy(() =>
  import("../features/posts/PostEditorPage").then((module) => ({
    default: module.PostEditorPage,
  })),
);
const CategoriesPage = lazy(() =>
  import("../features/categories/CategoriesPage").then((module) => ({
    default: module.CategoriesPage,
  })),
);
const TagsPage = lazy(() =>
  import("../features/tags/TagsPage").then((module) => ({
    default: module.TagsPage,
  })),
);
const MomentsPage = lazy(() =>
  import("../features/moments/MomentsPage").then((module) => ({
    default: module.MomentsPage,
  })),
);
const MomentEditorPage = lazy(() =>
  import("../features/moments/MomentEditorPage").then((module) => ({
    default: module.MomentEditorPage,
  })),
);
const FriendsPage = lazy(() =>
  import("../features/friends/FriendsPage").then((module) => ({
    default: module.FriendsPage,
  })),
);
const AttachmentsPage = lazy(() =>
  import("../features/attachments/AttachmentsPage").then((module) => ({
    default: module.AttachmentsPage,
  })),
);
const AboutPage = lazy(() =>
  import("../features/about/AboutPage").then((module) => ({
    default: module.AboutPage,
  })),
);
const AppearancePage = lazy(() =>
  import("../features/appearance/AppearancePage").then((module) => ({
    default: module.AppearancePage,
  })),
);
const ApiStatusPage = lazy(() =>
  import("../features/system/ApiStatusPage").then((module) => ({
    default: module.ApiStatusPage,
  })),
);

const navigation: AdminNavGroup[] = [
  { items: [{ label: "控制台", to: "/", icon: Gauge, end: true }] },
  {
    label: "内容",
    items: [
      { label: "文章管理", to: "/posts", icon: FileText },
      { label: "文章分类", to: "/categories", icon: FolderTree },
      { label: "文章标签", to: "/tags", icon: Tags },
      { label: "动态管理", to: "/moments", icon: Zap },
      { label: "关于页面", to: "/about", icon: Info },
    ],
  },
  {
    label: "资源",
    items: [
      { label: "附件管理", to: "/attachments", icon: FileImage },
      { label: "友链管理", to: "/friends", icon: Link2 },
    ],
  },
  {
    label: "系统",
    items: [
      { label: "用户管理", to: "/users", icon: Users },
      { label: "外观设置", to: "/appearance", icon: Palette },
      { label: "API 状态", to: "/api-status", icon: Activity },
    ],
  },
];

function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  if (!user) return null;
  const name = user.nickname ?? user.name ?? user.username ?? String(user.id);
  async function signOut() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast({
        tone: "error",
        title: "退出请求失败",
        description:
          error instanceof Error ? error.message : "本地会话已清理。",
      });
      navigate("/login", { replace: true });
    }
  }
  return (
    <AdminLayout
      navigation={navigation}
      user={{
        name,
        email: user.email,
        role: user.role ?? user.roles?.join(" / ") ?? "管理员",
        avatarUrl: user.avatar ?? undefined,
      }}
      systemStatus="operational"
      systemStatusText="管理端已连接"
      onLogout={signOut}
    />
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="route-loading">
          <LoadingState label="正在加载管理模块…" />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth
              loadingFallback={
                <div className="route-loading">
                  <LoadingState label="正在验证登录状态…" />
                </div>
              }
            />
          }
        >
          <Route element={<AuthenticatedLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="posts/new" element={<PostEditorPage />} />
            <Route path="posts/:id/edit" element={<PostEditorPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="moments" element={<MomentsPage />} />
            <Route path="moments/new" element={<MomentEditorPage />} />
            <Route path="moments/:id/edit" element={<MomentEditorPage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="attachments" element={<AttachmentsPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="appearance" element={<AppearancePage />} />
            <Route path="api-status" element={<ApiStatusPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
