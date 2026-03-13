import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, BadgeCheck, ChevronLeft, ChevronRight, MessageSquareOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { publicImageUrl } from "@/utils/storage";

type Review = {
  id: string;
  author_name: string;
  author_location: string | null;
  rating: number;
  title: string | null;
  content: string;
  pros: string | null;
  cons: string | null;
  verified_purchase: boolean;
  created_at: string;
  images?: { id: string; image_url: string }[];
};

type RatingSummary = {
  average_rating: number;
  total_reviews: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
};

const REVIEWS_PER_PAGE = 5;

function Stars({ count, size = "h-3.5 w-3.5" }: { count: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${size} ${i < count ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} dias atrás`;
  return d.toLocaleDateString("pt-BR");
}

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: revs }, { data: summ }] = await Promise.all([
        cloud.from("product_reviews").select("*").eq("product_id", productId).eq("approved", true).order("created_at", { ascending: false }).limit(100),
        cloud.from("product_rating_summary").select("*").eq("product_id", productId).single(),
      ]);

      const reviewsList = (revs ?? []) as Review[];

      // Load images for reviews
      if (reviewsList.length > 0) {
        const reviewIds = reviewsList.map((r) => r.id);
        const { data: imgs } = await cloud
          .from("review_images")
          .select("id, review_id, image_url, sort_order")
          .in("review_id", reviewIds)
          .order("sort_order", { ascending: true });

        if (imgs && imgs.length > 0) {
          const imgMap = new Map<string, { id: string; image_url: string }[]>();
          for (const img of imgs) {
            const list = imgMap.get((img as any).review_id) ?? [];
            list.push({ id: (img as any).id, image_url: (img as any).image_url });
            imgMap.set((img as any).review_id, list);
          }
          for (const r of reviewsList) {
            r.images = imgMap.get(r.id) ?? [];
          }
        }
      }

      setReviews(reviewsList);
      setSummary(summ as RatingSummary | null);
      setPage(0);
      setLoading(false);
    };
    load();
  }, [productId]);

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
      ))}
    </div>
  );

  const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const pagedReviews = reviews.slice(page * REVIEWS_PER_PAGE, (page + 1) * REVIEWS_PER_PAGE);

  const ratingBars = summary ? [
    { label: "5", count: summary.rating_5, pct: summary.total_reviews ? (summary.rating_5 / summary.total_reviews) * 100 : 0 },
    { label: "4", count: summary.rating_4, pct: summary.total_reviews ? (summary.rating_4 / summary.total_reviews) * 100 : 0 },
    { label: "3", count: summary.rating_3, pct: summary.total_reviews ? (summary.rating_3 / summary.total_reviews) * 100 : 0 },
    { label: "2", count: summary.rating_2, pct: summary.total_reviews ? (summary.rating_2 / summary.total_reviews) * 100 : 0 },
    { label: "1", count: summary.rating_1, pct: summary.total_reviews ? (summary.rating_1 / summary.total_reviews) * 100 : 0 },
  ] : [];

  return (
    <>
      <Card className="rounded-2xl border-border bg-card shadow-sm min-w-0 max-w-full overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4 min-w-0">
          <h3 className="text-sm font-semibold break-words [overflow-wrap:anywhere]">Avaliações de clientes</h3>

          {/* Summary */}
          {summary && summary.total_reviews > 0 && (
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 min-w-0">
                <div className="text-3xl sm:text-4xl font-bold shrink-0">{Number(summary.average_rating).toFixed(1)}</div>
                <div className="flex flex-col items-center gap-0.5 min-w-0">
                  <Stars count={Math.round(Number(summary.average_rating))} size="h-4 w-4" />
                  <div className="text-[10px] text-muted-foreground break-words [overflow-wrap:anywhere]">{summary.total_reviews} avaliações</div>
                </div>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {ratingBars.map((bar) => (
                  <div key={bar.label} className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] w-2.5 text-right text-muted-foreground shrink-0">{bar.label}</span>
                    <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 shrink-0" />
                    <Progress value={bar.pct} className="h-1.5 flex-1 min-w-0" />
                    <span className="text-[10px] w-5 text-muted-foreground shrink-0">{bar.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {reviews.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <MessageSquareOff className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Este produto ainda não possui comentários.</p>
              <p className="text-xs text-muted-foreground/70">Seja o primeiro a avaliar!</p>
            </div>
          )}

          {/* Reviews list */}
          {pagedReviews.length > 0 && (
            <div className="space-y-3 min-w-0">
              {pagedReviews.map((r) => (
                <div key={r.id} className="border-t border-border pt-3 first:border-0 first:pt-0 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                    <Stars count={r.rating} />
                    {r.verified_purchase && (
                      <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                        <BadgeCheck className="h-3 w-3" /> Verificada
                      </span>
                    )}
                  </div>
                  {r.title && <p className="text-xs font-medium break-words [overflow-wrap:anywhere]">{r.title}</p>}
                  <p className="text-xs text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere]">{r.content}</p>

                  {/* Review images */}
                  {r.images && r.images.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-none">
                      {r.images.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setLightboxImg(img.image_url)}
                          className="shrink-0 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all"
                        >
                          <img
                            src={img.image_url}
                            alt="Foto da avaliação"
                            className="h-16 w-16 object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {(r.pros || r.cons) && (
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] min-w-0">
                      {r.pros && <span className="text-green-600 break-words [overflow-wrap:anywhere]">👍 {r.pros}</span>}
                      {r.cons && <span className="text-red-500 break-words [overflow-wrap:anywhere]">👎 {r.cons}</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-muted-foreground min-w-0">
                    <span className="font-medium text-foreground break-words [overflow-wrap:anywhere]">{r.author_name}</span>
                    {r.author_location && (
                      <span className="flex items-center gap-0.5 break-words [overflow-wrap:anywhere]">
                        <MapPin className="h-2.5 w-2.5 shrink-0" /> {r.author_location}
                      </span>
                    )}
                    <span>• {timeAgo(r.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {page + 1} de {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Foto ampliada"
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
