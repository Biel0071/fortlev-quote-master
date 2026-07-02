import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Heart, Search, ShoppingBag, X, Plus, Minus, Trash2, Sparkles } from "lucide-react";
import { loadFashionCart, saveFashionCart, type FashionCartLine } from "@/lib/fashionCart";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  promo_price: number | null;
  badge: string | null;
  featured: boolean;
  gallery: string[] | null;
};

type Variant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  color_hex: string | null;
  stock: number;
};

type CartLine = FashionCartLine;

const CATEGORIES = [
  { key: "todos", label: "Todos" },
  { key: "feminino", label: "Feminino" },
  { key: "masculino", label: "Masculino" },
  { key: "infantil", label: "Infantil" },
  { key: "acessorios", label: "Acessórios" },
  { key: "promocoes", label: "Promoções" },
];

const SIZES = ["PP", "P", "M", "G", "GG"];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useCountdown(hours = 12) {
  const [ms, setMs] = useState(hours * 3600 * 1000);
  useEffect(() => {
    const t = setInterval(() => setMs((m) => Math.max(0, m - 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { h, m, s };
}

export default function FashionHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string, Variant[]>>({});
  const [category, setCategory] = useState("todos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartLine[]>(() => loadFashionCart());
  const [cartOpen, setCartOpen] = useState(false);
  const timer = useCountdown(24);

  // Persist cart across pages
  useEffect(() => {
    saveFashionCart(cart);
  }, [cart]);

  useEffect(() => {
    (async () => {
      const { data: storeRows } = await cloud
        .from("stores")
        .select("id")
        .eq("slug", "moda-fashion")
        .maybeSingle();
      const storeId = storeRows?.id;
      if (!storeId) {
        setLoading(false);
        return;
      }
      const [{ data: prods }, { data: vars }] = await Promise.all([
        cloud
          .from("fashion_products")
          .select("id,name,slug,category,price,promo_price,badge,featured,gallery")
          .eq("store_id", storeId)
          .eq("active", true)
          .order("created_at", { ascending: true }),
        cloud
          .from("fashion_variants")
          .select("id,product_id,size,color,color_hex,stock"),
      ]);
      setProducts((prods as Product[]) ?? []);
      const grouped: Record<string, Variant[]> = {};
      (vars as Variant[] | null)?.forEach((v) => {
        (grouped[v.product_id] ??= []).push(v);
      });
      setVariants(grouped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category === "promocoes") {
        if (!p.promo_price) return false;
      } else if (category !== "todos" && p.category !== category) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [products, category, query]);

  const toggleFav = (id: string) => {
    setFavs((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const addToCart = (p: Product) => {
    const size = selectedSize[p.id] || "M";
    const vs = variants[p.id] || [];
    const first = vs.find((v) => v.size === size) || vs[0];
    const price = p.promo_price ?? p.price;
    const gradient =
      (p.gallery?.[0] as string) ||
      "linear-gradient(135deg,#8B5CF6,#EC4899)";
    setCart((c) => {
      const key = `${p.id}_${size}_${first?.color ?? "-"}`;
      const idx = c.findIndex(
        (l) => `${l.productId}_${l.size}_${l.color}` === key,
      );
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...c,
        {
          productId: p.id,
          name: p.name,
          price,
          size,
          color: first?.color ?? "Único",
          colorHex: first?.color_hex ?? "#8B5CF6",
          gradient,
          qty: 1,
        },
      ];
    });
    setCartOpen(true);
  };

  const cartCount = cart.reduce((a, l) => a + l.qty, 0);
  const cartSubtotal = cart.reduce((a, l) => a + l.price * l.qty, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            to="/loja/moda-fashion"
            className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent"
          >
            Moda Fashion
          </Link>
          <nav className="hidden md:flex items-center gap-5 ml-6 text-sm font-medium">
            {CATEGORIES.filter((c) => c.key !== "todos").map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`hover:text-[#8B5CF6] transition ${
                  category === c.key ? "text-[#8B5CF6]" : "text-slate-700"
                }`}
              >
                {c.label}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 w-72">
            <Search size={16} className="text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produtos..."
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-full">
            <Heart size={20} />
          </button>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 hover:bg-slate-100 rounded-full"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EC4899] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {/* mobile category strip */}
        <div className="md:hidden flex gap-2 px-4 pb-3 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                category === c.key
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs mb-4">
            <Sparkles size={14} /> Coleção Primavera
          </div>
          <h1 className="text-4xl md:text-6xl font-bold max-w-2xl leading-tight">
            Até 40% OFF em looks selecionados
          </h1>
          <p className="mt-4 text-white/90 max-w-lg">
            Peças exclusivas com caimento perfeito. Frete grátis acima de R$ 199.
          </p>
          <button
            onClick={() => setCategory("promocoes")}
            className="mt-8 bg-white text-[#8B5CF6] font-semibold px-8 py-3 rounded-full hover:scale-105 transition"
          >
            Comprar agora
          </button>

          {/* Countdown */}
          <div className="mt-10 inline-flex items-center gap-3 bg-black/25 rounded-2xl px-5 py-3">
            <span className="text-sm">Promoção termina em:</span>
            {[
              { v: timer.h, l: "h" },
              { v: timer.m, l: "m" },
              { v: timer.s, l: "s" },
            ].map((t, i) => (
              <div
                key={i}
                className="bg-white text-[#8B5CF6] font-bold rounded-lg px-3 py-1 min-w-[3rem] text-center"
              >
                {String(t.v).padStart(2, "0")}
                <span className="text-xs font-normal ml-0.5">{t.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {CATEGORIES.find((c) => c.key === category)?.label ?? "Produtos"}
            </h2>
            <p className="text-sm text-slate-500">
              {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-slate-100 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((p) => {
              const price = p.promo_price ?? p.price;
              const grad =
                (p.gallery?.[0] as string) ||
                "linear-gradient(135deg,#8B5CF6,#EC4899)";
              const size = selectedSize[p.id] || "M";
              return (
                <div
                  key={p.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition"
                >
                  <div className="relative aspect-[3/4]" style={{ background: grad }}>
                    {p.badge && (
                      <span
                        className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          p.badge === "Oferta"
                            ? "bg-[#EC4899] text-white"
                            : "bg-white text-[#8B5CF6]"
                        }`}
                      >
                        {p.badge}
                      </span>
                    )}
                    <button
                      onClick={() => toggleFav(p.id)}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition"
                    >
                      <Heart
                        size={16}
                        className={
                          favs.has(p.id)
                            ? "fill-[#EC4899] text-[#EC4899]"
                            : "text-slate-700"
                        }
                      />
                    </button>
                    <Link
                      to={`/loja/moda-fashion/produto/${p.slug}`}
                      className="absolute inset-0"
                      aria-label={p.name}
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {p.category}
                    </div>
                    <Link
                      to={`/loja/moda-fashion/produto/${p.slug}`}
                      className="block font-semibold mt-1 line-clamp-2 hover:text-[#8B5CF6]"
                    >
                      {p.name}
                    </Link>

                    <div className="flex items-baseline gap-2 mt-2">
                      {p.promo_price && (
                        <span className="text-xs line-through text-slate-400">
                          {brl(p.price)}
                        </span>
                      )}
                      <span className="text-lg font-bold text-[#8B5CF6]">
                        {brl(price)}
                      </span>
                    </div>

                    <div className="flex gap-1 mt-3">
                      {SIZES.map((sz) => (
                        <button
                          key={sz}
                          onClick={() =>
                            setSelectedSize((s) => ({ ...s, [p.id]: sz }))
                          }
                          className={`flex-1 text-xs py-1 rounded border transition ${
                            size === sz
                              ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                              : "border-slate-200 hover:border-[#8B5CF6]"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => addToCart(p)}
                      className="w-full mt-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition text-sm"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-500">
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h3 className="text-2xl font-bold">Fique por dentro</h3>
          <p className="text-slate-600 mt-2">
            Cadastre seu e-mail e receba 10% OFF na primeira compra.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              placeholder="seu@email.com"
              className="flex-1 px-4 py-3 rounded-full border border-slate-300 outline-none focus:border-[#8B5CF6]"
            />
            <button className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold px-6 py-3 rounded-full">
              Cadastrar
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">
              Moda Fashion
            </div>
            <p className="text-sm mt-3 text-slate-400">
              Estilo, qualidade e atitude em cada peça.
            </p>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Institucional</div>
            <ul className="space-y-2 text-sm">
              <li>Sobre nós</li>
              <li>Trocas e devoluções</li>
              <li>Política de privacidade</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Atendimento</div>
            <ul className="space-y-2 text-sm">
              <li>Central de ajuda</li>
              <li>WhatsApp</li>
              <li>Rastreio de pedido</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Pagamento</div>
            <p className="text-sm text-slate-400">
              PIX, Cartão de crédito, Boleto. Parcelamos em até 10x.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Moda Fashion Store. Todos os direitos reservados.
        </div>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          <aside className="w-full max-w-md bg-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-bold text-lg">Sacola ({cartCount})</div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 && (
                <div className="text-center text-slate-500 py-16">
                  <ShoppingBag className="mx-auto mb-3" />
                  Sua sacola está vazia.
                </div>
              )}
              {cart.map((l, i) => (
                <div
                  key={i}
                  className="flex gap-3 bg-slate-50 rounded-xl p-3"
                >
                  <div
                    className="w-20 h-20 rounded-lg flex-shrink-0"
                    style={{ background: l.gradient }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{l.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>Tam: {l.size}</span>
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300"
                        style={{ background: l.colorHex }}
                      />
                      <span>{l.color}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-white rounded-full border">
                        <button
                          onClick={() =>
                            setCart((c) =>
                              c
                                .map((x, xi) =>
                                  xi === i ? { ...x, qty: x.qty - 1 } : x,
                                )
                                .filter((x) => x.qty > 0),
                            )
                          }
                          className="p-1.5"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm w-5 text-center">{l.qty}</span>
                        <button
                          onClick={() =>
                            setCart((c) =>
                              c.map((x, xi) =>
                                xi === i ? { ...x, qty: x.qty + 1 } : x,
                              ),
                            )
                          }
                          className="p-1.5"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="font-bold text-[#8B5CF6]">
                        {brl(l.price * l.qty)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setCart((c) => c.filter((_, xi) => xi !== i))
                    }
                    className="text-slate-400 hover:text-[#EC4899]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-semibold">{brl(cartSubtotal)}</span>
                </div>
                <Link
                  to="/loja/moda-fashion/checkout"
                  onClick={() => setCartOpen(false)}
                  className="block text-center w-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold py-3 rounded-full"
                >
                  Finalizar compra
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
