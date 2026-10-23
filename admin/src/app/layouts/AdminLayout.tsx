import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Leaf,
  ArrowUpRight,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAdminTheme } from "../../shared/hooks/useAdminTheme";
import { Button } from "../../shared/ui";

export type SystemStatus = "operational" | "degraded" | "offline";
export type { ThemeMode } from "../../shared/hooks/useAdminTheme";

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string | number;
}

export interface AdminNavGroup {
  label?: string;
  items: AdminNavItem[];
}

export interface AdminUser {
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

export interface AdminLayoutProps {
  navigation: AdminNavGroup[];
  user: AdminUser;
  systemStatus?: SystemStatus;
  systemStatusText?: string;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onLogout: () => void | Promise<void>;
  brandName?: string;
  brandSubtitle?: string;
  brandMark?: ReactNode;
  children?: ReactNode;
  headerActions?: ReactNode;
  profilePath?: string;
}

const statusContent: Record<
  SystemStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  operational: { label: "系统运行正常", tone: "success" },
  degraded: { label: "部分服务异常", tone: "warning" },
  offline: { label: "服务不可用", tone: "danger" },
};

function initials(name: string) {
  return Array.from(name.trim()).slice(0, 2).join("").toUpperCase() || "U";
}

export function AdminLayout({
  navigation,
  user,
  systemStatus = "operational",
  systemStatusText,
  notificationCount = 0,
  onNotificationsClick,
  onLogout,
  brandName = "Mossline",
  brandSubtitle = "内容管理后台",
  brandMark,
  children,
  headerActions,
  profilePath,
}: AdminLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useAdminTheme();
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  const pageName =
    navigation
      .flatMap((group) => group.items)
      .find((item) =>
        item.to === "/"
          ? location.pathname === "/"
          : location.pathname === item.to ||
            location.pathname.startsWith(item.to + "/"),
      )?.label ?? "内容管理";
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currentStatus = statusContent[systemStatus];

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = contentRef.current?.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 180, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [location.pathname]);

  useEffect(() => {
    setMobileSidebarOpen(false);
    setUserMenuOpen(false);
  }, [user]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node))
        setUserMenuOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileSidebarOpen]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);
  const handleLogout = () => {
    setUserMenuOpen(false);
    try {
      void Promise.resolve(onLogout()).catch(() => undefined);
    } catch {
      // 注销错误由调用方处理，布局组件不重复提示
    }
  };

  return (
    <div
      className={`admin-shell ${sidebarCollapsed ? "admin-shell--collapsed" : ""}`}
    >
      {mobileSidebarOpen && (
        <button
          className="admin-shell__scrim"
          onClick={closeMobileSidebar}
          aria-label="关闭导航"
        />
      )}
      <aside
        className={`admin-sidebar ${mobileSidebarOpen ? "admin-sidebar--open" : ""}`}
        aria-label="管理后台导航"
      >
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__mark" aria-hidden="true">
            {brandMark ?? <Leaf strokeWidth={1.7} />}
          </div>
          <div className="admin-sidebar__brand-copy">
            <strong>{brandName}</strong>
            <span>{brandSubtitle}</span>
          </div>
          <Button
            className="admin-sidebar__mobile-close"
            variant="ghost"
            size="icon"
            aria-label="关闭导航"
            onClick={closeMobileSidebar}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <nav className="admin-sidebar__nav">
          {navigation.map((group, groupIndex) => (
            <div
              className="admin-sidebar__group"
              key={group.label ?? groupIndex}
            >
              {group.label && (
                <p className="admin-sidebar__group-label">{group.label}</p>
              )}
              {group.items.map(({ label, to, icon: Icon, badge, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={closeMobileSidebar}
                  title={sidebarCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    `admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`
                  }
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                  {badge !== undefined && (
                    <span className="admin-sidebar__badge">{badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__status">
            <span
              className={`admin-status-dot admin-status-dot--${systemStatus}`}
            />
            <span>{systemStatusText ?? currentStatus.label}</span>
          </div>
          <Button
            className="admin-sidebar__collapse"
            variant="ghost"
            size="sm"
            leftIcon={
              sidebarCollapsed ? (
                <PanelLeftOpen aria-hidden="true" />
              ) : (
                <PanelLeftClose aria-hidden="true" />
              )
            }
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {sidebarCollapsed ? null : "收起侧栏"}
          </Button>
        </div>
      </aside>

      <div className="admin-shell__main">
        <header className="admin-topbar">
          <div className="admin-topbar__leading">
            <Button
              className="admin-topbar__menu"
              variant="ghost"
              size="icon"
              aria-label="打开导航"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            <div className="admin-topbar__breadcrumb">
              <span>工作台</span>
              <span aria-hidden="true">/</span>
              <strong>{pageName}</strong>
            </div>
          </div>
          <div className="admin-topbar__actions">
            {headerActions}
            <a
              className="admin-topbar__site-link"
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              <span>访问首页</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                theme === "dark" ? "切换至浅色主题" : "切换至深色主题"
              }
              title={theme === "dark" ? "浅色主题" : "深色主题"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" />
              ) : (
                <Moon aria-hidden="true" />
              )}
            </Button>
            {onNotificationsClick && (
              <button
                className="admin-topbar__notification"
                type="button"
                onClick={onNotificationsClick}
                aria-label={
                  notificationCount > 0
                    ? `${notificationCount} 条未读通知`
                    : "通知"
                }
              >
                <Bell aria-hidden="true" />
                {notificationCount > 0 && (
                  <span>
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>
            )}
            <div className="admin-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="admin-user-menu__trigger"
                aria-label="账号菜单"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((value) => !value)}
              >
                <span className="admin-avatar">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" />
                  ) : (
                    initials(user.name)
                  )}
                </span>
                <span className="admin-user-menu__copy">
                  <strong>{user.name}</strong>
                  <small>{user.role ?? user.email}</small>
                </span>
                <ChevronDown aria-hidden="true" />
              </button>
              {userMenuOpen && (
                <div className="admin-user-menu__popover" role="menu">
                  <div className="admin-user-menu__summary">
                    <strong>{user.name}</strong>
                    {user.email && <span>{user.email}</span>}
                  </div>
                  {profilePath && (
                    <NavLink
                      to={profilePath}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserRound aria-hidden="true" />
                      个人资料
                    </NavLink>
                  )}
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    <LogOut aria-hidden="true" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="admin-content" ref={contentRef}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
