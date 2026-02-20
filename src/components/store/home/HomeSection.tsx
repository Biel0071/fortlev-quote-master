import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HomeSection({
  id,
  title,
  subtitle,
  children,
  tone = "plain",
  action,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  tone?: "plain" | "alt";
  action?: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 py-8 sm:py-12",
        tone === "alt" ? "bg-secondary/40" : "bg-background",
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <header className="flex items-end justify-between gap-4 flex-wrap mb-5 sm:mb-6">
          <div className="min-w-0">
            <h2 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>

        {children}
      </div>
    </section>
  );
}
