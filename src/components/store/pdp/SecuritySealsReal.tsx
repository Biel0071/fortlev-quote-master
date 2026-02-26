import securitySealsReal from "@/assets/pdp/security-seals-real.png";

export function SecuritySealsReal() {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm">
      <div className="p-5">
        <div className="font-semibold">Selos de Segurança</div>
        <div className="mt-4 rounded-2xl border border-border bg-background p-5 flex items-center justify-center">
          <img
            src={securitySealsReal}
            alt="Selos de Segurança: Google Safe Browsing e Loja Protegida"
            className="max-h-10 w-auto max-w-full object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
