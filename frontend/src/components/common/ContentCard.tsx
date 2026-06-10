import React from "react";

export function Card({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      {...rest}
      className={
        "app-surface-card rounded-xl border border-border bg-card p-6 shadow-soft " + className
      }
    >
      {children}
    </div>
  );
}
