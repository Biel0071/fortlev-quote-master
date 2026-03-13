import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send, CheckCircle } from "lucide-react";
import { cloud } from "@/lib/cloud";
import { toast } from "@/hooks/use-toast";

export function CustomerReviewForm({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorLocation, setAuthorLocation] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = rating > 0 && authorName.trim().length >= 2 && content.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await cloud.from("product_reviews").insert({
        product_id: productId,
        author_name: authorName.trim(),
        author_location: authorLocation.trim() || null,
        rating,
        title: title.trim() || null,
        content: content.trim(),
        approved: false,
        origin: "customer",
        verified_purchase: false,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Avaliação enviada!", description: "Sua avaliação será analisada e publicada em breve." });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-5 text-center space-y-2">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
          <p className="text-sm font-medium">Obrigado pela sua avaliação!</p>
          <p className="text-xs text-muted-foreground">
            Ela será revisada e publicada em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden rounded-2xl border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-5 space-y-4 min-w-0">
        <h3 className="text-sm font-semibold break-words">Deixe sua avaliação</h3>

        {/* Star rating */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Sua nota</p>
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => {
              const starValue = i + 1;
              const filled = starValue <= (hoverRating || rating);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(starValue)}
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                  aria-label={`${starValue} estrela${starValue > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Name + Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Seu nome *</label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Maria Silva"
              className="h-9 text-sm w-full"
              maxLength={60}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cidade (opcional)</label>
            <Input
              value={authorLocation}
              onChange={(e) => setAuthorLocation(e.target.value)}
              placeholder="São Paulo, SP"
              className="h-9 text-sm w-full"
              maxLength={60}
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Título (opcional)</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ótimo produto!"
            className="h-9 text-sm"
            maxLength={100}
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Sua avaliação *</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Conte sua experiência com o produto..."
            className="text-sm min-h-[80px] resize-none"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{content.length}/500</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full h-10 rounded-xl gap-2 text-sm"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Enviando..." : "Enviar avaliação"}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center break-words leading-relaxed px-1">
          Sua avaliação será revisada antes da publicação.
        </p>
      </CardContent>
    </Card>
  );
}
