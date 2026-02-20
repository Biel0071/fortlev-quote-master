import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { hexToHslTuple } from "@/utils/color";
import { theme as defaultTheme } from "@/theme/themeConfig";

export type ThemeSettingsRow = {
  id: string;
  primary_color: string;
  primary_hover: string;
  accent_color: string;
  accent_hover: string;
  background_color: string;
  surface_color: string;
  text_primary: string;
  text_secondary: string;
  border_color: string;
};

function applyThemeToRoot(s: Partial<ThemeSettingsRow>) {
  const root = document.documentElement;

  const fallback = {
    background: hexToHslTuple(defaultTheme.colors.background, "210 20% 98%"),
    surface: hexToHslTuple(defaultTheme.colors.surface, "0 0% 100%"),
    primary: hexToHslTuple(defaultTheme.colors.primary, "214 85% 18%"),
    accent: hexToHslTuple(defaultTheme.colors.accent, "24 95% 52%"),
    textPrimary: hexToHslTuple(defaultTheme.colors.textPrimary, "210 50% 10%"),
    textSecondary: hexToHslTuple(defaultTheme.colors.textSecondary, "210 20% 45%"),
    border: hexToHslTuple(defaultTheme.colors.border, "210 20% 88%"),
    error: hexToHslTuple(defaultTheme.colors.error, "0 84% 60%"),
    success: hexToHslTuple(defaultTheme.colors.success, "142 70% 45%"),
  };

  // Core shadcn tokens
  root.style.setProperty(
    "--background",
    hexToHslTuple(s.background_color ?? defaultTheme.colors.background, fallback.background),
  );
  root.style.setProperty(
    "--foreground",
    hexToHslTuple(s.text_primary ?? defaultTheme.colors.textPrimary, fallback.textPrimary),
  );

  root.style.setProperty(
    "--card",
    hexToHslTuple(s.surface_color ?? defaultTheme.colors.surface, fallback.surface),
  );
  root.style.setProperty(
    "--card-foreground",
    hexToHslTuple(s.text_primary ?? defaultTheme.colors.textPrimary, fallback.textPrimary),
  );

  root.style.setProperty(
    "--popover",
    hexToHslTuple(s.surface_color ?? defaultTheme.colors.surface, fallback.surface),
  );
  root.style.setProperty(
    "--popover-foreground",
    hexToHslTuple(s.text_primary ?? defaultTheme.colors.textPrimary, fallback.textPrimary),
  );

  // Primary
  root.style.setProperty(
    "--primary",
    hexToHslTuple(s.primary_color ?? defaultTheme.colors.primary, fallback.primary),
  );
  root.style.setProperty("--primary-foreground", "0 0% 100%");

  // Accent (orange)
  root.style.setProperty(
    "--accent",
    hexToHslTuple(s.accent_color ?? defaultTheme.colors.accent, fallback.accent),
  );
  root.style.setProperty("--accent-foreground", "0 0% 100%");

  // Promo uses accent as action/destaque
  root.style.setProperty(
    "--promo",
    hexToHslTuple(s.accent_color ?? defaultTheme.colors.accent, fallback.accent),
  );
  root.style.setProperty("--promo-foreground", "0 0% 100%");

  // Neutrals
  root.style.setProperty(
    "--secondary",
    hexToHslTuple("#EEF2F7", "210 20% 94%"),
  );
  root.style.setProperty(
    "--secondary-foreground",
    hexToHslTuple(s.text_primary ?? defaultTheme.colors.textPrimary, fallback.textPrimary),
  );

  root.style.setProperty(
    "--muted",
    hexToHslTuple("#E9EEF5", "210 15% 92%"),
  );
  root.style.setProperty(
    "--muted-foreground",
    hexToHslTuple(s.text_secondary ?? defaultTheme.colors.textSecondary, fallback.textSecondary),
  );

  root.style.setProperty(
    "--border",
    hexToHslTuple(s.border_color ?? defaultTheme.colors.border, fallback.border),
  );
  root.style.setProperty(
    "--input",
    hexToHslTuple(s.border_color ?? defaultTheme.colors.border, fallback.border),
  );

  root.style.setProperty("--destructive", hexToHslTuple(defaultTheme.colors.error, fallback.error));
  root.style.setProperty("--destructive-foreground", "0 0% 100%");

  root.style.setProperty("--ring", hexToHslTuple(s.primary_color ?? defaultTheme.colors.primary, fallback.primary));

  // Premium defaults
  root.style.setProperty("--radius", "0.75rem");
}

export function useThemeSettings() {
  const [settings, setSettings] = useState<ThemeSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await cloud
        .from("system_theme_settings")
        .select(
          "id, primary_color, primary_hover, accent_color, accent_hover, background_color, surface_color, text_primary, text_secondary, border_color",
        )
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (error || !data) {
        setSettings(null);
        // still apply defaults
        applyThemeToRoot({});
      } else {
        setSettings(data as any);
        applyThemeToRoot(data as any);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const api = useMemo(
    () => ({
      applyPreview: (partial: Partial<ThemeSettingsRow>) => applyThemeToRoot(partial),
      settings,
      loading,
      refresh: async () => {
        const { data } = await cloud
          .from("system_theme_settings")
          .select(
            "id, primary_color, primary_hover, accent_color, accent_hover, background_color, surface_color, text_primary, text_secondary, border_color",
          )
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        setSettings((data as any) ?? null);
        applyThemeToRoot((data as any) ?? {});
      },
    }),
    [settings, loading],
  );

  return api;
}
