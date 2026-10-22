function articlePath(slug: string): string {
  return `/articles/${encodeURIComponent(slug)}`;
}

/** 拼接经过编码的公开文章路径，站点基址缺失或无效时返回相对路径 */
export function buildPublicArticleUrl(slug: string, baseUrl = ""): string {
  const path = articlePath(slug);
  const normalizedBase = baseUrl.trim();
  if (!normalizedBase) return path;

  try {
    return new URL(path, normalizedBase).toString();
  } catch {
    return path;
  }
}

/** 解析公开文章地址，兼容本地独立端口和生产环境的站点配置 */
export function publicArticleUrl(slug: string): string {
  const configuredBase = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (configuredBase) return buildPublicArticleUrl(slug, configuredBase);
  if (import.meta.env.DEV)
    return buildPublicArticleUrl(slug, "http://localhost:5173");

  // 未配置站点地址时，生产环境使用当前域名下的相对路径
  return buildPublicArticleUrl(slug);
}
