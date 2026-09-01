import type { ReactNode } from "react";

export function PageCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`page-card ${className}`.trim()}>{children}</section>
  );
}
