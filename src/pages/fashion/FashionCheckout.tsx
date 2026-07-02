import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Check, ChevronLeft } from "lucide-react";
import {
  clearFashionCart,
  loadFashionCart,
  type FashionCartLine,
} from "@/lib/fashionCart";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STEPS = [
  "Dados Pessoais",
  "Endereço",
  "Frete",
  "Pagamento",
  "Confirmação",
];

const SHIPPING_OPTIONS = [
  { id: "pac", label: "PAC", days: "5-8 dias úteis", price: 24.9 },
  { id: "sedex", label: "SEDEX", days: "2-3 dias úteis", price: 39.9 },
  { id: "expresso", label: "Expresso", days: "1 dia útil", price: 59.9 },
];

const PAYMENT_METHODS = [
  { id: "pix", label: "PIX", note: "5% de desconto" },
  { id: "credit", label: "Cartão de Crédito", note: "Até 10x sem juros" },
  { id: "boleto", label: "Boleto", note: "Vencimento em 3 dias" },
];

export default function FashionCheckout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<FashionCartLine[]>(() => loadFashionCart());
  const [step, setStep] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  // Step 2
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // Step 3
  const [shippingId, setShippingId] = useState("pac");

  // Step 4
  const [payment, setPayment] = useState("pix");
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    if (cart.length === 0 && !orderId) {
      // let user still see step 5 after clearing; otherwise redirect
    }
  }, [cart, orderId]);

  const subtotal = useMemo(
    () => cart.reduce((a, l) => a + l.price * l.qty, 0),
    [cart],
  );
  const shippingCost =
    SHIPPING_OPTIONS.find((s) => s.id === shippingId)?.price ?? 0;
  const discount = payment === "pix" ? subtotal * 0.05 : 0;
  const total = Math.max(0, subtotal + shippingCost - discount);

  const lookupCep = async (raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setAddress(`${j.logradouro ?? ""}${j.bairro ? " - " + j.bairro : ""}`);
        setCity(j.localidade ?? "");
        setUf(j.uf ?? "");
      }
    } catch {
      /* ignore */
    } finally {
      setCepLoading(false);
    }
  };

  const canAdvance = () => {
    if (step === 0)
      return name.trim().length > 2 && email.includes("@") && phone.length >= 10;
    if (step === 1)
      return cep.replace(/\D/g, "").length === 8 && address && number && city;
    if (step === 2) return !!shippingId;
    if (step === 3) return !!payment;
    return true;
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const { data: storeRow } = await cloud
        .from("stores")
        .select("id")
        .eq("slug", "moda-fashion")
        .maybeSingle();
      const storeId = storeRow?.id;
      if (!storeId) throw new Error("Loja não encontrada");

      const { data: cust } = await cloud
        .from("fashion_customers")
        .insert({
          store_id: storeId,
          name,
          email,
          phone,
          cep,
          address: `${address}, ${number}${complement ? " - " + complement : ""}, ${city}/${uf}`,
        })
        .select("id")
        .maybeSingle();

      const { data: order } = await cloud
        .from("fashion_orders")
        .insert({
          store_id: storeId,
          customer_id: cust?.id ?? null,
          status: "pending",
          items: cart as any,
          subtotal,
          shipping: shippingCost,
          discount,
          total,
          payment_method: payment,
        })
        .select("id")
        .maybeSingle();

      if (order?.id) {
        setOrderId(order.id as string);
        clearFashionCart();
        setCart([]);
        setStep(4);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setPlacing(false);
    }
  };

  if (cart.length === 0 && step < 4 && !orderId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-600">Sua sacola está vazia.</p>
        <Link
          to="/loja/moda-fashion"
          className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold px-6 py-3 rounded-full"
        >
          Voltar à loja
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/loja/moda-fashion"
            className="flex items-center gap-2 text-slate-700 hover:text-[#8B5CF6]"
          >
            <ChevronLeft size={18} /> Continuar comprando
          </Link>
          <div className="text-xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">
            Checkout
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${
                    i < step
                      ? "bg-[#8B5CF6] text-white"
                      : i === step
                        ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
                        : "bg-white border border-slate-300 text-slate-400"
                  }`}
                >
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <div className="text-xs mt-1 hidden sm:block">{label}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    i < step ? "bg-[#8B5CF6]" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16 grid lg:grid-cols-3 gap-6">
        {/* Content */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Dados pessoais</h2>
              <Field label="Nome completo" value={name} onChange={setName} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="E-mail" value={email} onChange={setEmail} type="email" />
                <Field label="Telefone" value={phone} onChange={setPhone} />
              </div>
              <Field label="CPF (opcional)" value={cpf} onChange={setCpf} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Endereço de entrega</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="CEP"
                  value={cep}
                  onChange={(v) => {
                    setCep(v);
                    if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                  }}
                  hint={cepLoading ? "Buscando…" : undefined}
                />
              </div>
              <Field label="Endereço" value={address} onChange={setAddress} />
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Número" value={number} onChange={setNumber} />
                <Field
                  label="Complemento"
                  value={complement}
                  onChange={setComplement}
                />
                <Field label="Cidade" value={city} onChange={setCity} />
              </div>
              <Field label="UF" value={uf} onChange={setUf} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Frete</h2>
              {SHIPPING_OPTIONS.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer ${
                    shippingId === s.id
                      ? "border-[#8B5CF6] bg-purple-50"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    checked={shippingId === s.id}
                    onChange={() => setShippingId(s.id)}
                    className="accent-[#8B5CF6]"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.days}</div>
                  </div>
                  <div className="font-bold">{brl(s.price)}</div>
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Pagamento</h2>
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer ${
                    payment === m.id
                      ? "border-[#EC4899] bg-pink-50"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    checked={payment === m.id}
                    onChange={() => setPayment(m.id)}
                    className="accent-[#EC4899]"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{m.label}</div>
                    <div className="text-xs text-slate-500">{m.note}</div>
                  </div>
                </label>
              ))}
              {payment === "credit" && (
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <Field label="Número do cartão" value="" onChange={() => {}} />
                  <Field label="Nome no cartão" value="" onChange={() => {}} />
                  <Field label="Validade (MM/AA)" value="" onChange={() => {}} />
                  <Field label="CVV" value="" onChange={() => {}} />
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold">Parcelas</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    >
                      {Array.from({ length: 10 }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}x de {brl(total / (i + 1))} sem juros
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white">
                <Check size={30} />
              </div>
              <h2 className="text-2xl font-bold mt-4">Pedido confirmado!</h2>
              <p className="text-slate-600 mt-2">
                Enviamos os detalhes para <b>{email}</b>.
              </p>
              {orderId && (
                <p className="text-slate-500 mt-1 text-sm">
                  Nº do pedido: <span className="font-mono">{orderId.slice(0, 8)}</span>
                </p>
              )}
              <button
                onClick={() => navigate("/loja/moda-fashion")}
                className="mt-6 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold px-8 py-3 rounded-full"
              >
                Voltar à loja
              </button>
            </div>
          )}

          {/* Nav buttons */}
          {step < 4 && (
            <div className="flex justify-between mt-8">
              <button
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="px-6 py-2.5 rounded-full border disabled:opacity-40"
              >
                Voltar
              </button>
              {step < 3 ? (
                <button
                  disabled={!canAdvance()}
                  onClick={() => setStep((s) => s + 1)}
                  className="px-6 py-2.5 rounded-full bg-[#8B5CF6] text-white font-semibold disabled:opacity-40"
                >
                  Continuar
                </button>
              ) : (
                <button
                  disabled={!canAdvance() || placing}
                  onClick={placeOrder}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold disabled:opacity-40"
                >
                  {placing ? "Processando…" : "Finalizar pedido"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="bg-white rounded-2xl p-6 shadow-sm h-fit sticky top-6">
          <h3 className="font-bold mb-4">Resumo do pedido</h3>
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {cart.map((l, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div
                  className="w-12 h-12 rounded-lg flex-shrink-0"
                  style={{ background: l.gradient }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.name}</div>
                  <div className="text-xs text-slate-500">
                    {l.qty}x • {l.size} • {l.color}
                  </div>
                </div>
                <div className="font-semibold">{brl(l.price * l.qty)}</div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={brl(subtotal)} />
            <Row label="Frete" value={brl(shippingCost)} />
            {discount > 0 && (
              <Row label="Desconto PIX" value={`- ${brl(discount)}`} />
            )}
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-[#8B5CF6]">{brl(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-[#8B5CF6] outline-none"
      />
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
