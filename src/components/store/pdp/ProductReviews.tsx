import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ThumbsUp, MapPin, BadgeCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

function Stars({ count, size = "h-4 w-4" }: { count: number; size?: string }) {
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

  useEffect(() => {
    if (!productId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: revs }, { data: summ }] = await Promise.all([
        cloud.from("product_reviews").select("*").eq("product_id", productId).eq("approved", true).order("created_at", { ascending: false }).limit(20),
        cloud.from("product_rating_summary").select("*").eq("product_id", productId).single(),
      ]);
      setReviews((revs ?? []) as Review[]);
      setSummary(summ as RatingSummary | null);
      setLoading(false);
    };
    load();
  }, [productId]);

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
      ))}
    </div>
  );

  if (!reviews.length) return null;

  const ratingBars = summary ? [
    { label: "5", count: summary.rating_5, pct: summary.total_reviews ? (summary.rating_5 / summary.total_reviews) * 100 : 0 },
    { label: "4", count: summary.rating_4, pct: summary.total_reviews ? (summary.rating_4 / summary.total_reviews) * 100 : 0 },
    { label: "3", count: summary.rating_3, pct: summary.total_reviews ? (summary.rating_3 / summary.total_reviews) * 100 : 0 },
    { label: "2", count: summary.rating_2, pct: summary.total_reviews ? (summary.rating_2 / summary.total_reviews) * 100 : 0 },
    { label: "1", count: summary.rating_1, pct: summary.total_reviews ? (summary.rating_1 / summary.total_reviews) * 100 : 0 },
  ] : [];

  return (
    <Card className="rounded-3xl border-border bg-card shadow-sm">
      <CardContent className="p-5 space-y-5">
        <h3 className="text-lg font-bold">Avaliações de clientes</h3>

        {/* Summary */}
        {summary && summary.total_reviews > 0 && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="text-4xl font-bold">{Number(summary.average_rating).toFixed(1)}</div>
              <Stars count={Math.round(Number(summary.average_rating))} size="h-5 w-5" />
              <div className="text-xs text-muted-foreground">{summary.total_reviews} avaliações</div>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingBars.map((bar) => (
                <div key={bar.label} className="flex items-center gap-2">
                  <span className="text-xs w-3 text-right text-muted-foreground">{bar.label}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <Progress value={bar.pct} className="h-2 flex-1" />
                  <span className="text-xs w-6 text-muted-foreground">{bar.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews list */}
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Stars count={r.rating} />
                {r.verified_purchase && (
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                    <BadgeCheck className="h-3 w-3" /> Compra verificada
                  </span>
                )}
              </div>
              {r.title && <p className="font-semibold text-sm">{r.title}</p>}
              <p className="text-sm text-muted-foreground leading-relaxed">{r.content}</p>
              {(r.pros || r.cons) && (
                <div className="flex flex-wrap gap-4 mt-2 text-xs">
                  {r.pros && <span className="text-green-600">👍 {r.pros}</span>}
                  {r.cons && <span className="text-red-500">👎 {r.cons}</span>}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.author_name}</span>
                {r.author_location && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> {r.author_location}
                  </span>
                )}
                <span>• {timeAgo(r.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
