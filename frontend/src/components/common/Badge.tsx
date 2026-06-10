export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "primary";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-muted-foreground",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    primary: "bg-primary-soft text-primary",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " +
        tones[tone] +
        " " +
        className
      }
    >
      {children}
    </span>
  );
}
