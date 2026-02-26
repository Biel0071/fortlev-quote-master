import visa from "@/assets/pdp/payments/visa.png";
import mastercard from "@/assets/pdp/payments/mastercard.png";
import elo from "@/assets/pdp/payments/elo.png";
import amex from "@/assets/pdp/payments/amex.png";
import pix from "@/assets/pdp/payments/pix.png";
import boleto from "@/assets/pdp/payments/boleto.png";

const PAYMENT_LOGOS = [
  { src: visa, alt: "Visa" },
  { src: mastercard, alt: "Mastercard" },
  { src: elo, alt: "Elo" },
  { src: amex, alt: "American Express" },
  { src: pix, alt: "Pix" },
  { src: boleto, alt: "Boleto" },
] as const;

export function PaymentLogosReal() {
  return (
    <div className="mt-3" aria-label="Formas de pagamento">
      <div className="flex flex-wrap items-center gap-4">
        {PAYMENT_LOGOS.map((l) => (
          <img
            key={l.alt}
            src={l.src}
            alt={`Forma de pagamento: ${l.alt}`}
            className="h-10 w-auto max-w-full object-contain"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}

