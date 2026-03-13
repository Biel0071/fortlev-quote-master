import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable page container — constrains width, adds horizontal padding,
 * and prevents any child from overflowing the viewport.
 */
export function StoreContainer({
  children,
  className,
  as: Tag = "div",
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "main" | "section";
  narrow?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "w-full mx-auto px-3 sm:px-6",
        narrow ? "max-w-4xl" : "max-w-6xl",
        "min-w-0 overflow-x-hidden",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
