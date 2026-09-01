import { Info } from "lucide-react";

export function ApiRequirement({ children }: { children: string }) {
  return (
    <div className="api-notice">
      <Info size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
