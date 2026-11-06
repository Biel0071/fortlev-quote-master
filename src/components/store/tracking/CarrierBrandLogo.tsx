import React, { useState } from "react";
import { Truck } from "lucide-react";

export interface OfficialCarrierMeta {
  slug: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  bgLight: string;
  website: string;
  trackingUrlTemplate: string;
  slaRate: number;
  modality: string;
  svgDataUri: string;
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const OFFICIAL_CARRIERS: OfficialCarrierMeta[] = [
  {
    slug: "jadlog",
    name: "Jadlog",
    shortName: "JADLOG",
    primaryColor: "#DC0032",
    secondaryColor: "#1E1E1E",
    bgLight: "#FFF1F3",
    website: "https://www.jadlog.com.br",
    trackingUrlTemplate: "https://www.jadlog.com.br/siteInstitucional/tracking.jad?tracking={code}",
    slaRate: 98.6,
    modality: "Expresso & Rodoviário",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#FFFFFF"/>
        <g transform="translate(14, 13)">
          <path d="M22 2L40 12.5V33.5L22 44L4 33.5V12.5L22 2Z" fill="#DC0032"/>
          <path d="M22 2L40 12.5L22 23L4 12.5L22 2Z" fill="#FF2A55"/>
          <path d="M22 23V44L4 33.5V12.5L22 23Z" fill="#B00028"/>
          <path d="M13 18L22 23L31 18" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 23V34" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
        </g>
        <text x="64" y="42" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="28" letter-spacing="-0.8" fill="#1E1E1E">jad</text>
        <text x="106" y="42" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="28" letter-spacing="-0.8" fill="#DC0032">log</text>
        <text x="65" y="55" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="8.5" letter-spacing="1.5" fill="#71717A">DPDGROUP</text>
      </svg>
    `),
  },
  {
    slug: "correios",
    name: "Correios",
    shortName: "CORREIOS",
    primaryColor: "#00416B",
    secondaryColor: "#FFCC00",
    bgLight: "#FFFBEB",
    website: "https://www.correios.com.br",
    trackingUrlTemplate: "https://rastreamento.correios.com.br/app/index.php?codigo={code}",
    slaRate: 97.9,
    modality: "SEDEX / PAC Nacional",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#FFCC00"/>
        <g transform="translate(14, 15)">
          <path d="M4 20L18 6H34L20 20L34 34H18L4 20Z" fill="#00416B"/>
          <path d="M22 20L36 6H46L32 20L46 34H36L22 20Z" fill="#0066A4"/>
        </g>
        <text x="66" y="41" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="26" letter-spacing="-0.5" fill="#00416B">Correios</text>
        <text x="67" y="54" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="8.5" letter-spacing="1.6" fill="#00416B">SEDEX • PAC</text>
      </svg>
    `),
  },
  {
    slug: "braspress",
    name: "Braspress",
    shortName: "BRASPRESS",
    primaryColor: "#003882",
    secondaryColor: "#F37021",
    bgLight: "#EFF6FF",
    website: "https://www.braspress.com",
    trackingUrlTemplate: "https://www.braspress.com/rastreie-sua-encomenda/?codigo={code}",
    slaRate: 99.1,
    modality: "Carga Pesada & Fracionada",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#003882"/>
        <rect x="0" y="54" width="220" height="16" fill="#F37021"/>
        <circle cx="30" cy="30" r="15" fill="#F37021"/>
        <path d="M22 30H38M32 24L38 30L32 36" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="54" y="37" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" letter-spacing="0.5" fill="#FFFFFF">BRASPRESS</text>
      </svg>
    `),
  },
  {
    slug: "jamef",
    name: "Jamef",
    shortName: "JAMEF",
    primaryColor: "#ED1C24",
    secondaryColor: "#003366",
    bgLight: "#FEF2F2",
    website: "https://www.jamef.com.br",
    trackingUrlTemplate: "https://www.jamef.com.br/rastreamento?codigo={code}",
    slaRate: 99.3,
    modality: "Encomendas Urgentes",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#FFFFFF"/>
        <rect x="8" y="12" width="44" height="46" rx="10" fill="#ED1C24"/>
        <path d="M18 35H42M34 26L42 35L34 44" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="62" y="39" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="27" letter-spacing="0.5" fill="#003366">JAMEF</text>
        <text x="63" y="53" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="8" letter-spacing="1.2" fill="#ED1C24">ENCOMENDAS URGENTES</text>
      </svg>
    `),
  },
  {
    slug: "rodonaves",
    name: "Rodonaves",
    shortName: "RTE RODONAVES",
    primaryColor: "#0054A6",
    secondaryColor: "#F7941D",
    bgLight: "#F0F9FF",
    website: "https://www.rodonaves.com.br",
    trackingUrlTemplate: "https://www.rodonaves.com.br/rastreio-de-mercadoria?codigo={code}",
    slaRate: 98.8,
    modality: "Transporte Rodoviário B2B",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#0054A6"/>
        <path d="M14 48L28 18H46L32 48H14Z" fill="#F7941D"/>
        <text x="20" y="39" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="13" fill="#FFFFFF">RTE</text>
        <text x="54" y="38" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="21" letter-spacing="0.3" fill="#FFFFFF">RODONAVES</text>
        <rect x="54" y="45" width="142" height="4" rx="2" fill="#F7941D"/>
      </svg>
    `),
  },
  {
    slug: "azul-cargo",
    name: "Azul Cargo",
    shortName: "AZUL CARGO",
    primaryColor: "#0033A0",
    secondaryColor: "#00AEEF",
    bgLight: "#F0F9FF",
    website: "https://www.azulcargoexpress.com.br",
    trackingUrlTemplate: "https://www.azulcargoexpress.com.br/Rastreio/Rastreio?codigo={code}",
    slaRate: 99.4,
    modality: "Aéreo & Expresso",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#0033A0"/>
        <circle cx="32" cy="35" r="17" fill="#00AEEF"/>
        <path d="M23 37L40 27L35 43L31 37L23 37Z" fill="#FFFFFF"/>
        <text x="58" y="37" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="23" fill="#FFFFFF">Azul</text>
        <text x="112" y="37" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="23" fill="#00AEEF">Cargo</text>
        <text x="59" y="51" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="8.5" letter-spacing="2" fill="#BAE6FD">EXPRESS</text>
      </svg>
    `),
  },
  {
    slug: "loggi",
    name: "Loggi",
    shortName: "LOGGI",
    primaryColor: "#00A8FF",
    secondaryColor: "#0B1B32",
    bgLight: "#F0F9FF",
    website: "https://www.loggi.com",
    trackingUrlTemplate: "https://www.loggi.com/rastreio/{code}",
    slaRate: 98.2,
    modality: "Last-Mile Express",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#00A8FF"/>
        <rect x="16" y="16" width="38" height="38" rx="11" fill="#FFFFFF"/>
        <path d="M27 35L33 41L44 29" stroke="#00A8FF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="66" y="44" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="30" letter-spacing="-0.5" fill="#FFFFFF">loggi</text>
      </svg>
    `),
  },
  {
    slug: "total-express",
    name: "Total Express",
    shortName: "TOTAL EXPRESS",
    primaryColor: "#E31B23",
    secondaryColor: "#1D1D1B",
    bgLight: "#FEF2F2",
    website: "https://totalexpress.com.br",
    trackingUrlTemplate: "https://tracking.totalexpress.com.br/?code={code}",
    slaRate: 97.8,
    modality: "E-Commerce Standard",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#FFFFFF"/>
        <circle cx="32" cy="35" r="18" fill="#E31B23"/>
        <path d="M23 35H41M34 28L41 35L34 42" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="58" y="36" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" fill="#E31B23">TOTAL</text>
        <text x="58" y="52" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="15" letter-spacing="1.5" fill="#1D1D1B">EXPRESS</text>
      </svg>
    `),
  },
  {
    slug: "tnt-fedex",
    name: "TNT / FedEx",
    shortName: "FEDEX / TNT",
    primaryColor: "#4D148C",
    secondaryColor: "#FF6600",
    bgLight: "#FAF5FF",
    website: "https://www.fedex.com/pt-br/home.html",
    trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={code}",
    slaRate: 99.2,
    modality: "Expresso Corporativo",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#FFFFFF"/>
        <text x="20" y="44" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="32" letter-spacing="-1.5" fill="#4D148C">Fed</text>
        <text x="76" y="44" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="32" letter-spacing="-1.5" fill="#FF6600">Ex</text>
        <rect x="128" y="20" width="72" height="30" rx="8" fill="#FF6600"/>
        <text x="142" y="41" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="20" fill="#FFFFFF">TNT</text>
      </svg>
    `),
  },
  {
    slug: "latam-cargo",
    name: "LATAM Cargo",
    shortName: "LATAM CARGO",
    primaryColor: "#1B0088",
    secondaryColor: "#E8114B",
    bgLight: "#EEF2FF",
    website: "https://www.latamcargo.com",
    trackingUrlTemplate: "https://www.latamcargo.com/pt/rastrear?code={code}",
    slaRate: 99.0,
    modality: "Carga Aérea Prioritária",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#1B0088"/>
        <path d="M18 22L42 30L26 48L18 22Z" fill="#E8114B"/>
        <text x="54" y="38" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="23" letter-spacing="1" fill="#FFFFFF">LATAM</text>
        <text x="55" y="52" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="10" letter-spacing="3" fill="#E8114B">CARGO</text>
      </svg>
    `),
  },
  {
    slug: "mercado-envios",
    name: "Mercado Envios",
    shortName: "MERCADO ENVIOS",
    primaryColor: "#2D3277",
    secondaryColor: "#FFE600",
    bgLight: "#FEFCE8",
    website: "https://envios.mercadolivre.com.br",
    trackingUrlTemplate: "https://www.mercadolivre.com.br/gz/shipping/tracking?id={code}",
    slaRate: 98.9,
    modality: "Full & Flex Rápido",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#FFE600"/>
        <circle cx="32" cy="35" r="16" fill="#2D3277"/>
        <path d="M23 35H41M34 29L41 35L34 41" stroke="#FFE600" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="56" y="34" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18" fill="#2D3277">Mercado</text>
        <text x="56" y="51" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18" fill="#2D3277">Envios</text>
      </svg>
    `),
  },
  {
    slug: "frota-propria",
    name: "Frota Própria Expressa",
    shortName: "FROTA PRÓPRIA",
    primaryColor: "#1E3A8A",
    secondaryColor: "#10B981",
    bgLight: "#EFF6FF",
    website: "",
    trackingUrlTemplate: "/rastreio?q={code}",
    slaRate: 99.7,
    modality: "Caminhão Dedicado Obra",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70" fill="none">
        <rect width="220" height="70" rx="14" fill="#1E3A8A"/>
        <rect x="14" y="18" width="34" height="34" rx="10" fill="#10B981"/>
        <path d="M22 35H38M32 29L38 35L32 41" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="58" y="35" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="19" fill="#FFFFFF">FROTA PRÓPRIA</text>
        <text x="58" y="50" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="9.5" letter-spacing="1.5" fill="#34D399">ENTREGA DIRETA NA OBRA</text>
      </svg>
    `),
  },
];

export function resolveOfficialCarrier(nameOrSlug?: string | null): OfficialCarrierMeta | null {
  if (!nameOrSlug) return null;
  const norm = nameOrSlug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  for (const c of OFFICIAL_CARRIERS) {
    const cName = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (
      norm === c.slug ||
      norm === cName ||
      norm.includes(c.slug) ||
      norm.includes(cName) ||
      (c.slug === "correios" && (norm.includes("sedex") || norm.includes("pac"))) ||
      (c.slug === "rodonaves" && norm.includes("rte")) ||
      (c.slug === "tnt-fedex" && (norm.includes("tnt") || norm.includes("fedex"))) ||
      (c.slug === "frota-propria" && (norm.includes("frota") || norm.includes("propria") || norm.includes("fortlev") || norm.includes("atacadista")))
    ) {
      return c;
    }
  }
  return null;
}

interface CarrierBrandLogoProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const CarrierBrandLogo: React.FC<CarrierBrandLogoProps> = ({
  name,
  logoUrl,
  size = "md",
  className = "",
}) => {
  const [customImgFailed, setCustomImgFailed] = useState(false);
  const official = resolveOfficialCarrier(name);

  // Known broken hotlinks from older seed versions should directly use the official vector SVG
  const isKnownBrokenUrl =
    !logoUrl ||
    logoUrl.includes("jadlog.com.br/images/logo-jadlog-novo.png") ||
    logoUrl.includes("loggi.com/static/images/logo-loggi.svg") ||
    logoUrl.includes("azulcargo.com.br/images/logo.png") ||
    logoUrl.includes("totalexpress.com.br/wp-content/uploads") ||
    logoUrl.includes("wikimedia.org/wikipedia/pt/2/23/Correios_Brasil.png");

  const sizeClasses = {
    sm: "h-7 w-20 rounded-lg",
    md: "h-10 w-28 rounded-xl",
    lg: "h-14 w-40 rounded-2xl",
    xl: "h-16 w-48 rounded-2xl",
  }[size];

  const effectiveSrc =
    !isKnownBrokenUrl && !customImgFailed && logoUrl
      ? logoUrl
      : official?.svgDataUri || null;

  if (effectiveSrc) {
    return (
      <div
        className={`inline-flex items-center justify-center overflow-hidden border border-slate-200/80 bg-white shadow-sm shrink-0 ${sizeClasses} ${className}`}
        title={name || official?.name || "Transportadora"}
      >
        <img
          src={effectiveSrc}
          alt={name || official?.name || "Transportadora"}
          className="w-full h-full object-contain p-0.5"
          onError={() => setCustomImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-slate-50 text-primary font-black uppercase text-xs px-2.5 shadow-sm shrink-0 ${sizeClasses} ${className}`}
    >
      <Truck className="w-4 h-4 shrink-0" />
      <span className="truncate">{name || "Logística"}</span>
    </div>
  );
};
