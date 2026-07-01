import mfLogo from "@/assets/mf-logo.png.asset.json";

interface StoreUnderDevelopmentProps {
  storeName?: string;
  logoUrl?: string;
}

/**
 * Placeholder mostrado quando uma loja está cadastrada no sistema multi-sites
 * mas ainda não possui conteúdo publicado. Cada domínio no projeto pode
 * apontar para lojas diferentes; esta é exibida quando a loja resolvida
 * está marcada como "em desenvolvimento".
 */
export function StoreUnderDevelopment({ storeName, logoUrl }: StoreUnderDevelopmentProps) {
  const displayLogo = logoUrl || mfLogo.url;
  const displayName = storeName || "Mania Fashion Atacadista";

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-6 py-12">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-8">
        <img
          src={displayLogo}
          alt={displayName}
          className="w-56 sm:w-64 h-auto object-contain"
        />

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-foreground">
            Site em desenvolvimento
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Estamos preparando algo especial para você.
            <br />
            Em breve, nossa loja estará no ar.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <span className="h-px w-10 bg-border" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Em breve
          </span>
          <span className="h-px w-10 bg-border" />
        </div>
      </div>
    </main>
  );
}
