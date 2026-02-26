import seloSafeBrowsing from "@/assets/trust/selo-google-safe-browsing-vert.png";
import seloLojaProtegida from "@/assets/trust/selo-loja-protegida-upload.png";

export function SecuritySealsReal() {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm">
      <div className="p-5">
        <div className="font-semibold">Selos de Segurança</div>
        <div className="mt-4 rounded-2xl border border-border bg-background p-5 flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <img
              src={seloSafeBrowsing}
              alt="Selo de Segurança: Google Safe Browsing"
              className="max-h-[4.375rem] w-auto max-w-full object-contain"
              loading="lazy"
            />
            <img
              src={seloLojaProtegida}
              alt="Selo de Segurança: Loja Protegida"
              className="max-h-[4.375rem] w-auto max-w-full object-contain"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
