import type { LucideIcon } from "lucide-react";
import { Card } from "./ContentCard";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {hint && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <h3 className="mt-1 text-3xl font-semibold text-foreground">{value}</h3>
    </Card>
  );
}
