import pagamentoVisa from "@/assets/trust/pagamento-visa.png";

export function PaymentLogosReal() {
  return (
    <div className="mt-3">
      <img
        src={pagamentoVisa}
        alt="Pagamento: Visa"
        className="h-7 w-auto max-w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}
