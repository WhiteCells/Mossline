function articlePath(slug: string): string {
  return `/articles/${encodeURIComponent(slug)}`;
}

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

/** Resolve a public article URL across the split local dev servers and production. */
export function publicArticleUrl(slug: string): string {
  const configuredBase = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (configuredBase) return buildPublicArticleUrl(slug, configuredBase);
  if (import.meta.env.DEV)
    return buildPublicArticleUrl(slug, "http://localhost:5173");

  // A relative URL follows the current origin in production deployments.
  return buildPublicArticleUrl(slug);
}
