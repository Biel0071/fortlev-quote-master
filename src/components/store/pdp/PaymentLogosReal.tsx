import paymentLogos from "@/assets/pdp/payment-logos-upload.png";

export function PaymentLogosReal() {
  return (
    <div className="mt-3" aria-label="Formas de pagamento">
      <img
        src={paymentLogos}
        alt="Formas de pagamento: Visa, Mastercard, Elo, American Express, Diners, Pix e Boleto"
        className="h-7 w-auto max-w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

