import type { LucideIcon } from "lucide-react";

export function UploadDropzone({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="app-surface-muted mb-8 cursor-pointer rounded-xl border-2 border-dashed border-border bg-card p-10 text-center transition-all hover:border-primary/40 hover:bg-primary-soft/30">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
