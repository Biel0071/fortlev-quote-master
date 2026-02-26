import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { InstitutionalPageModel, InstitutionalTestimonial } from "@/content/institutionalCopy";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-primary" : "text-muted-foreground"}`}
          fill={i < rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: InstitutionalTestimonial }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold leading-tight">{t.name}</div>
            <div className="text-xs text-muted-foreground">{t.city}</div>
          </div>
          <Stars rating={t.rating} />
        </div>

        <p className="text-sm leading-relaxed text-foreground/90">“{t.quote}”</p>

        <div className="flex flex-wrap gap-2">
          {t.workRef ? <Badge variant="secondary">{t.workRef}</Badge> : null}
          {t.videoUrl ? (
            <a
              href={t.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground shadow-sm"
            >
              Vídeo
            </a>
          ) : null}
        </div>

        {t.deliveryPhotoAlt ? (
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            {t.deliveryPhotoAlt}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function InstitutionalPremiumContent({ model }: { model: InstitutionalPageModel }) {
  return (
    <div className="space-y-10">
      {model.sections.map((sec, idx) => {
        if (sec.kind === "steps") {
          return (
            <section key={idx} className="space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{sec.title}</h2>
              <div className="grid grid-cols-1 gap-3">
                {sec.steps.map((st, i) => (
                  <Card key={i} className="rounded-2xl">
                    <CardContent className="p-5">
                      <div className="font-semibold">{st.title}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed mt-1">{st.description}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        }

        if (sec.kind === "testimonials") {
          return (
            <section key={idx} className="space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{sec.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sec.testimonials.map((t, i) => (
                  <TestimonialCard key={i} t={t} />
                ))}
              </div>
            </section>
          );
        }

        if (sec.kind === "legal") {
          return (
            <section key={idx} className="space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{sec.title}</h2>
              <Card className="rounded-2xl">
                <CardContent className="p-6 space-y-6">
                  {sec.clauses.map((c, i) => (
                    <div key={i} className="space-y-2">
                      <div className="font-semibold">{c.heading}</div>
                      <div className="space-y-2">
                        {c.body.map((p, j) => (
                          <p key={j} className="text-sm sm:text-base leading-relaxed text-foreground/90">
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          );
        }

        return (
          <section key={idx} className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{sec.title}</h2>
            <div className="space-y-3">
              {sec.paragraphs?.map((p, i) => (
                <p key={i} className="text-sm sm:text-base leading-relaxed text-foreground/90">
                  {p}
                </p>
              ))}
            </div>
            {sec.bullets?.length ? (
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base text-foreground/90">
                {sec.bullets.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
