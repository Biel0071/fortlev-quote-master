import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Ícone vetorial oficial multicolorido do triângulo do Google Play.
 */
export function GooglePlayTriangleIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M19.7,19.2L4.3,35.3c0,0,0,0,0,0c0.5,1.7,2.1,3,4,3c0.8,0,1.5-0.2,2.1-0.6l0,0l17.4-9.9L19.7,19.2z"
        fill="#EA4335"
      />
      <path
        d="M35.3,16.4L35.3,16.4l-7.5-4.3l-8.4,7.4l8.5,8.3l7.5-4.2c1.3-0.7,2.2-2.1,2.2-3.6C37.5,18.5,36.6,17.1,35.3,16.4z"
        fill="#FBBC04"
      />
      <path
        d="M4.3,4.7C4.2,5,4.2,5.4,4.2,5.8v28.5c0,0.4,0,0.7,0.1,1.1l16-15.7L4.3,4.7z"
        fill="#4285F4"
      />
      <path
        d="M19.8,20l8-7.9L10.5,2.3C9.9,1.9,9.1,1.7,8.3,1.7c-1.9,0-3.6,1.3-4,3c0,0,0,0,0,0L19.8,20z"
        fill="#34A853"
      />
    </svg>
  );
}

/**
 * Selo único "Disponível no Google Play" direcionando para a tela oficial do app Material Online.
 */
export function GooglePlayStoreBadge({
  to = "/google-play",
  className,
}: {
  to?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border border-white/25 bg-black px-4 py-2 text-white shadow-sm transition-all hover:bg-neutral-900 hover:border-white/50 active:scale-[0.99]",
        className,
      )}
      aria-label="Disponível no Google Play — Abrir aplicativo Material Online"
    >
      <GooglePlayTriangleIcon className="h-7 w-7 shrink-0" />
      <div className="flex flex-col text-left leading-none">
        <span className="text-[10px] font-medium tracking-wide text-white/85">Disponível no</span>
        <span className="text-[17px] font-semibold tracking-tight text-white mt-0.5">Google Play</span>
      </div>
    </Link>
  );
}

/**
 * Selo interativo Google Rating 4,8 clicável que rola para o topo da página.
 */
export function GoogleRatingBadge({
  rating = "4,8",
  onClick,
  className,
}: {
  rating?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Google Rating 4,8 — Voltar ao topo"
      aria-label={`Google Rating ${rating} — Clique para ir ao topo da página`}
      className={cn(
        "group inline-flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white text-left shadow-xs transition-transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      <span className="block h-1.5 w-full bg-[#00a859]" aria-hidden="true" />
      <div className="flex items-center gap-2.5 px-3 py-2">
        <svg viewBox="0 0 36 36" className="h-7 w-7 shrink-0" aria-hidden="true">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#EA4335" strokeWidth="3.5" strokeDasharray="22 66" strokeDashoffset="0" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#4285F4" strokeWidth="3.5" strokeDasharray="22 66" strokeDashoffset="-22" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#34A853" strokeWidth="3.5" strokeDasharray="22 66" strokeDashoffset="-44" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#FBBC05" strokeWidth="3.5" strokeDasharray="22 66" strokeDashoffset="-66" />
          <path
            d="M18 10.5l2.2 4.6 5.1.7-3.7 3.6.9 5-4.5-2.4-4.5 2.4.9-5-3.7-3.6 5.1-.7z"
            fill="#16a34a"
          />
        </svg>
        <div className="leading-tight">
          <div className="text-[11px] font-medium text-slate-600">Google Rating</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[15px] font-semibold tabular-nums leading-none text-[#e65100]">
              {rating}
            </span>
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3].map((idx) => (
                <svg key={idx} viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-[#ea580c]">
                  <path d="M10 1.5l2.5 5.1 5.6.8-4 3.9.9 5.6L10 14.3l-5 2.6.9-5.6-4-3.9 5.6-.8z" />
                </svg>
              ))}
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
                <defs>
                  <linearGradient id="google-rating-48-star" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="80%" stopColor="#ea580c" />
                    <stop offset="80%" stopColor="#fed7aa" />
                  </linearGradient>
                </defs>
                <path
                  d="M10 1.5l2.5 5.1 5.6.8-4 3.9.9 5.6L10 14.3l-5 2.6.9-5.6-4-3.9 5.6-.8z"
                  fill="url(#google-rating-48-star)"
                  stroke="#ea580c"
                  strokeWidth="0.9"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
