import { ReactNode } from "react";
import { useThemeSettings } from "@/hooks/useThemeSettings";

export function ThemeBoot({ children }: { children: ReactNode }) {
  // Just mounting this hook applies theme to :root
  useThemeSettings();
  return <>{children}</>;
}
