import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HomeSection({
  id,
  title,
  children,
  tone = "plain",
  action,
  className,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  tone?: "plain" | "alt";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 py-10 sm:py-14",
        tone === "alt" ? "bg-secondary/20" : "bg-background",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <header className="flex items-end justify-between gap-4 flex-wrap mb-5 sm:mb-6">
          <div className="min-w-0">
            <h2 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h2>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>

        {children}
      </div>
    </section>
  );
}
