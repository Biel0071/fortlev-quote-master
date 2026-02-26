import paymentLogosReal from "@/assets/pdp/payment-logos-real.png";

export function PaymentLogosReal() {
  return (
    <div className="mt-3">
      <img
        src={paymentLogosReal}
        alt="Formas de pagamento: Visa, Mastercard, Elo, American Express, Diners, Pix e Boleto"
        className="h-7 w-auto max-w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}
