import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, RefreshCw, ImageOff } from "lucide-react";

type ReviewItem = {
  id: string;
  product_id: string;
  image_url: string;
  image_path: string | null;
  source: string;
  confidence: number;
  ai_analysis: string | null;
  status: string;
  created_at: string;
  product_name?: string;
};

export default function AdminImageReview() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from("image_review_queue").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast.error("Erro ao carregar fila"); setLoading(false); return; }

    // Fetch product names
    const productIds = [...new Set((data || []).map((d: any) => d.product_id))];
    let products: Record<string, string> = {};
    if (productIds.length > 0) {
      const { data: prods } = await supabase.from("store_products").select("id,name").in("id", productIds);
      (prods || []).forEach((p: any) => { products[p.id] = p.name; });
    }

    setItems((data || []).map((d: any) => ({ ...d, product_name: products[d.product_id] || "Produto desconhecido" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await (supabase as any).from("image_review_queue").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }

    if (status === "approved") {
      const item = items.find((i) => i.id === id);
      if (item && !item.image_path) {
        // Download and save the image
        try {
          const resp = await fetch(item.image_url);
          if (resp.ok) {
            const blob = await resp.blob();
            const ext = item.image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg";
            const path = `products/${item.product_id}/${crypto.randomUUID()}.${ext}`;
            await supabase.storage.from("product-images").upload(path, blob, { contentType: blob.type });
            await supabase.from("store_product_images").insert({ product_id: item.product_id, path, sort_order: 0 });
            await (supabase as any).from("image_review_queue").update({ image_path: path }).eq("id", id);
          }
        } catch (e) {
          console.error("Download error:", e);
        }
      }
    }

    toast.success(status === "approved" ? "Imagem aprovada!" : "Imagem rejeitada");
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.7) return "text-green-600";
    if (c >= 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const confidenceLabel = (c: number) => {
    if (c >= 0.7) return "Alta";
    if (c >= 0.4) return "Média";
    return "Baixa";
  };

  const pending = items.filter((i) => i.status === "pending").length;
  const approved = items.filter((i) => i.status === "approved").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revisão de Imagens</h1>
          <p className="text-muted-foreground text-sm">Product Image Intelligence — Validação automática por IA</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer" onClick={() => setFilter("pending")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pending}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("approved")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{approved}</div>
            <div className="text-xs text-muted-foreground">Aprovadas</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("rejected")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{rejected}</div>
            <div className="text-xs text-muted-foreground">Rejeitadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovadas" : f === "rejected" ? "Rejeitadas" : "Todas"}
          </Button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ImageOff className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma imagem na fila</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-square bg-muted relative">
                <img
                  src={item.image_url}
                  alt={item.product_name}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
                <Badge className="absolute top-2 right-2" variant={item.status === "approved" ? "default" : item.status === "rejected" ? "destructive" : "secondary"}>
                  {item.status === "approved" ? "Aprovada" : item.status === "rejected" ? "Rejeitada" : "Pendente"}
                </Badge>
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="font-medium text-sm truncate">{item.product_name}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confiança:</span>
                  <span className={`font-bold ${confidenceColor(item.confidence)}`}>
                    {Math.round(item.confidence * 100)}% ({confidenceLabel(item.confidence)})
                  </span>
                </div>
                {item.ai_analysis && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.ai_analysis}</p>
                )}
                <p className="text-xs text-muted-foreground">Fonte: {item.source}</p>

                {item.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => updateStatus(item.id, "approved")}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateStatus(item.id, "rejected")}>
                      <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
