export function Button({
  children,
  variant = "primary",
  className = "",
  size,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon" | string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
    secondary:
      "bg-secondary text-foreground hover:bg-border",
    ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
    outline:
      "border border-border bg-card text-foreground hover:bg-secondary",
  };
  return (
    <button
      {...rest}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all " +
        styles[variant] +
        " " +
        className
      }
    >
      {children}
    </button>
  );
}
