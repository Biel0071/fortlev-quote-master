import { useEffect, useState } from "react";
import { MessageCircle, Send, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Comment = {
  id: string;
  author_name: string;
  rating: number;
  comment_text: string;
  created_at: string;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} estrelas`}
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
          />
        </button>
      ))}
    </div>
  );
}

function StarsReadonly({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

export function ProductComments({ productId }: { productId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_comments")
      .select("id, author_name, rating, comment_text, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setComments(data as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    if (productId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async () => {
    const author = name.trim();
    const body = text.trim();
    if (author.length < 2) return toast.error("Informe seu nome (mín. 2 caracteres).");
    if (body.length < 3) return toast.error("Escreva um comentário (mín. 3 caracteres).");
    if (rating < 1 || rating > 5) return toast.error("Selecione uma nota de 1 a 5.");

    setSending(true);
    const { error } = await supabase.from("product_comments").insert({
      product_id: productId,
      author_name: author.slice(0, 60),
      comment_text: body.slice(0, 1000),
      rating,
    });
    setSending(false);

    if (error) {
      toast.error("Não foi possível enviar seu comentário.");
      return;
    }
    toast.success("Comentário publicado!");
    setName("");
    setText("");
    setRating(5);
    load();
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Comentários {comments.length > 0 && <span className="text-muted-foreground">({comments.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium">Deixe seu comentário</p>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <Input
            placeholder="Seu nome"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Textarea
            placeholder="Conte sua experiência com este produto..."
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[96px] rounded-xl"
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={sending} className="h-11 rounded-xl gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Publicar comentário"}
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando comentários...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Seja o primeiro a comentar este produto.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.author_name}</span>
                    <StarsReadonly value={c.rating} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                  {c.comment_text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductComments;
