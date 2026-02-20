import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { theme as defaultTheme } from "@/theme/themeConfig";
import { useThemeSettings, type ThemeSettingsRow } from "@/hooks/useThemeSettings";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
      <div className="space-y-1">
        <Label className="text-sm">{label}</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-11 rounded-xl border border-border bg-background"
        aria-label={label}
      />
    </div>
  );
}

export default function AdminTheme() {
  const { toast } = useToast();
  const themeApi = useThemeSettings();

  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<ThemeSettingsRow | null>(null);

  useEffect(() => {
    if (themeApi.settings) setRow(themeApi.settings);
  }, [themeApi.settings]);

  useEffect(() => {
    if (!row) return;
    themeApi.applyPreview(row);
  }, [row]);

  const canRender = Boolean(row);

  const restoreDefaults = () => {
    const defaults: ThemeSettingsRow = {
      id: row?.id || "",
      primary_color: defaultTheme.colors.primary,
      primary_hover: defaultTheme.colors.primaryHover,
      accent_color: defaultTheme.colors.accent,
      accent_hover: defaultTheme.colors.accentHover,
      background_color: defaultTheme.colors.background,
      surface_color: defaultTheme.colors.surface,
      text_primary: defaultTheme.colors.textPrimary,
      text_secondary: defaultTheme.colors.textSecondary,
      border_color: defaultTheme.colors.border,
    };
    setRow(defaults);
  };

  const save = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const payload = { ...row } as any;
      // ensure single row: update if id exists, else insert
      if (payload.id) {
        const { error } = await cloud
          .from("system_theme_settings")
          .update({
            primary_color: payload.primary_color,
            primary_hover: payload.primary_hover,
            accent_color: payload.accent_color,
            accent_hover: payload.accent_hover,
            background_color: payload.background_color,
            surface_color: payload.surface_color,
            text_primary: payload.text_primary,
            text_secondary: payload.text_secondary,
            border_color: payload.border_color,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await cloud.from("system_theme_settings").insert({
          primary_color: payload.primary_color,
          primary_hover: payload.primary_hover,
          accent_color: payload.accent_color,
          accent_hover: payload.accent_hover,
          background_color: payload.background_color,
          surface_color: payload.surface_color,
          text_primary: payload.text_primary,
          text_secondary: payload.text_secondary,
          border_color: payload.border_color,
        } as any);
        if (error) throw error;
      }

      await themeApi.refresh();
      toast({ title: "Tema aplicado", description: "Cores atualizadas e persistidas." });
    } catch (e: any) {
      toast({
        title: "Falha ao salvar tema",
        description: e?.message || "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Tema</h1>
        <p className="text-sm text-muted-foreground">Edite as cores globais e aplique em tempo real.</p>
      </header>

      {!canRender ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Cores do sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <ColorField
                  label="Primary (Azul)"
                  value={row.primary_color}
                  onChange={(v) => setRow({ ...row, primary_color: v })}
                />
                <ColorField
                  label="Primary hover"
                  value={row.primary_hover}
                  onChange={(v) => setRow({ ...row, primary_hover: v })}
                />
                <ColorField
                  label="Accent (Laranja)"
                  value={row.accent_color}
                  onChange={(v) => setRow({ ...row, accent_color: v })}
                />
                <ColorField
                  label="Accent hover"
                  value={row.accent_hover}
                  onChange={(v) => setRow({ ...row, accent_hover: v })}
                />
                <ColorField
                  label="Background (Cinza)"
                  value={row.background_color}
                  onChange={(v) => setRow({ ...row, background_color: v })}
                />
                <ColorField
                  label="Surface (Cards)"
                  value={row.surface_color}
                  onChange={(v) => setRow({ ...row, surface_color: v })}
                />
                <ColorField
                  label="Texto primário"
                  value={row.text_primary}
                  onChange={(v) => setRow({ ...row, text_primary: v })}
                />
                <ColorField
                  label="Texto secundário"
                  value={row.text_secondary}
                  onChange={(v) => setRow({ ...row, text_secondary: v })}
                />
                <ColorField
                  label="Bordas"
                  value={row.border_color}
                  onChange={(v) => setRow({ ...row, border_color: v })}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={save} disabled={saving} className="rounded-xl">
                  {saving ? "Salvando..." : "Salvar e aplicar"}
                </Button>
                <Button variant="outline" onClick={restoreDefaults} className="rounded-xl">
                  Restaurar padrão azul/laranja
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
                <div className="text-sm text-muted-foreground">Header / UI</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button className="rounded-xl">Botão primário</Button>
                  <Button variant="accent" className="rounded-xl">
                    Ação / Destaque
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    Outline
                  </Button>
                </div>
                <div className="mt-4 text-sm">
                  <div className="font-medium">Texto primário</div>
                  <div className="text-muted-foreground">Texto secundário (muted)</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Dica: este preview aplica as variáveis CSS globalmente em tempo real.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
