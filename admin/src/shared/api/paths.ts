// 统一维护认证、内容和管理接口路径
export const apiPaths = {
  login: "/api/login",
  logout: "/api/logout",
  currentUser: "/api/me",
  dashboard: "/api/dashboard",
  users: "/api/admin/users",
  posts: "/api/post",
  categories: "/api/category",
  tags: "/api/tag",
  moments: "/api/moment",
  friends: "/api/friend",
  attachments: "/api/attachment",
  about: "/api/about",
  logs: "/api/log",
} as const;
