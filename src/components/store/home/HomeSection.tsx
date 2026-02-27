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
        "scroll-mt-28 py-8 sm:py-10",
        tone === "alt" ? "bg-secondary/20" : "bg-background",
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {title || subtitle || action ? (
          <header className="flex items-end justify-between gap-4 flex-wrap mb-4 sm:mb-5">
            <div className="min-w-0">
              {title ? <h2 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </header>
        ) : null}

        {children}
      </div>
    </section>
  );
}
