import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Save } from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string }

const DEFAULT_COLORS = { primary: "#1E3A8A", secondary: "#FACC15", accent: "#0EA5E9", background: "#FFFFFF", text: "#0F172A" };
const DEFAULT_FONTS = { heading: "Inter", body: "Inter" };

const StoreThemeEditor = ({ storeId }: Props) => {
  const qc = useQueryClient();
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [fonts, setFonts] = useState(DEFAULT_FONTS);
  const [customCss, setCustomCss] = useState("");

  const { data: theme, isLoading } = useQuery({
    queryKey: ["store-theme", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("store_themes").select("*").eq("store_id", storeId).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (theme) {
      setColors({ ...DEFAULT_COLORS, ...(theme.colors as any) });
      setFonts({ ...DEFAULT_FONTS, ...(theme.fonts as any) });
      setCustomCss(theme.custom_css || "");
    }
  }, [theme]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { store_id: storeId, colors, fonts, custom_css: customCss, updated_at: new Date().toISOString() };
      if (theme?.id) {
        const { error } = await supabase.from("store_themes").update(payload).eq("id", theme.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_themes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-theme", storeId] });
      toast.success("Tema salvo. Recarregue a loja para aplicar.");
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando tema…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette size={18} /> Editor de Tema</CardTitle>
        <CardDescription>Cores, fontes e CSS aplicados ao storefront desta loja.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-3">Cores</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(colors).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs capitalize">{k}</Label>
                <div className="flex gap-2">
                  <Input type="color" value={v} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="w-12 h-9 p-1" />
                  <Input value={v} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Fontes</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Heading</Label>
              <Input value={fonts.heading} onChange={(e) => setFonts({ ...fonts, heading: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body</Label>
              <Input value={fonts.body} onChange={(e) => setFonts({ ...fonts, body: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">CSS Customizado</Label>
          <textarea
            className="w-full mt-1 p-2 font-mono text-xs border rounded-md bg-background min-h-[120px]"
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            placeholder=":root { --custom: #fff; }"
          />
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
          <Save size={14} /> {save.isPending ? "Salvando…" : "Salvar Tema"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StoreThemeEditor;
