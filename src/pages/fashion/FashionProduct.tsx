import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { ChevronRight, Heart, Minus, Plus, ShoppingBag } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  badge: string | null;
  gallery: string[] | null;
};

type Variant = {
  id: string;
  size: string;
  color: string;
  color_hex: string | null;
  stock: number;
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FashionProduct() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState<string>("");
  const [size, setSize] = useState<string>("M");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: storeRow } = await cloud
        .from("stores")
        .select("id")
        .eq("slug", "moda-fashion")
        .maybeSingle();
      if (!storeRow?.id) return setLoading(false);
      const { data: p } = await cloud
        .from("fashion_products")
        .select("id,name,slug,category,description,price,promo_price,badge,gallery")
        .eq("store_id", storeRow.id)
        .eq("slug", slug)
        .maybeSingle();
      if (!p) return setLoading(false);
      setProduct(p as Product);
      const g = ((p as Product).gallery ?? []) as string[];
      setGallery(g.length ? g : ["linear-gradient(135deg,#8B5CF6,#EC4899)"]);
      const { data: vs } = await cloud
        .from("fashion_variants")
        .select("id,size,color,color_hex,stock")
        .eq("product_id", (p as Product).id);
      const list = (vs as Variant[]) ?? [];
      setVariants(list);
      if (list[0]) setColor(list[0].color);
      setLoading(false);
    })();
  }, [slug]);

  const colors = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach((v) => map.set(v.color, v.color_hex ?? "#8B5CF6"));
    return Array.from(map, ([name, hex]) => ({ name, hex }));
  }, [variants]);

  const sizes = useMemo(() => {
    const s = new Set<string>();
    variants.forEach((v) => s.add(v.size));
    return ["PP", "P", "M", "G", "GG"].filter((x) => s.has(x));
  }, [variants]);

  const current = variants.find((v) => v.size === size && v.color === color);
  const outOfStock = !current || current.stock <= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-4 w-48 bg-slate-100 rounded mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-slate-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-100 rounded w-3/4" />
            <div className="h-6 bg-slate-100 rounded w-1/3" />
            <div className="h-24 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Produto não encontrado.{" "}
        <Link to="/loja/moda-fashion" className="underline ml-2 text-[#8B5CF6]">
          Voltar
        </Link>
      </div>
    );
  }

  const price = product.promo_price ?? product.price;

  return (
    <div className="min-h-screen bg-white">
      {/* Header simplificado */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/loja/moda-fashion"
            className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent"
          >
            Moda Fashion
          </Link>
          <ShoppingBag />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="text-sm text-slate-500 flex items-center gap-1 mb-6">
          <Link to="/loja/moda-fashion" className="hover:text-[#8B5CF6]">
            Loja
          </Link>
          <ChevronRight size={14} />
          <span className="capitalize">{product.category}</span>
          <ChevronRight size={14} />
          <span className="text-slate-900 truncate">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Gallery */}
          <div>
            <div
              className="aspect-square rounded-2xl"
              style={{ background: gallery[activeImg] }}
            />
            <div className="flex gap-3 mt-4">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-20 h-20 rounded-lg border-2 ${
                    activeImg === i ? "border-[#8B5CF6]" : "border-transparent"
                  }`}
                  style={{ background: g }}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {product.category}
            </div>
            <h1 className="text-3xl font-bold mt-1">{product.name}</h1>

            <div className="flex items-baseline gap-3 mt-4">
              {product.promo_price && (
                <span className="line-through text-slate-400">
                  {brl(product.price)}
                </span>
              )}
              <span className="text-3xl font-bold text-[#8B5CF6]">
                {brl(price)}
              </span>
              {product.promo_price && (
                <span className="bg-[#EC4899] text-white text-xs px-2 py-1 rounded-full font-semibold">
                  -
                  {Math.round(
                    (1 - product.promo_price / product.price) * 100,
                  )}
                  %
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              ou 10x de {brl(price / 10)} sem juros
            </div>

            <p className="mt-6 text-slate-600 leading-relaxed">
              {product.description}
            </p>

            {/* Cor */}
            <div className="mt-6">
              <div className="text-sm font-semibold mb-2">
                Cor: <span className="text-slate-500 font-normal">{color}</span>
              </div>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    className={`w-9 h-9 rounded-full border-2 transition ${
                      color === c.name
                        ? "border-[#8B5CF6] scale-110"
                        : "border-slate-200"
                    }`}
                    style={{ background: c.hex }}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Tamanho */}
            <div className="mt-6">
              <div className="text-sm font-semibold mb-2">Tamanho</div>
              <div className="flex gap-2">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSize(sz)}
                    className={`w-12 h-12 rounded-lg border-2 font-semibold transition ${
                      size === sz
                        ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                        : "border-slate-200 hover:border-[#8B5CF6]"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantidade */}
            <div className="mt-6">
              <div className="text-sm font-semibold mb-2">Quantidade</div>
              <div className="inline-flex items-center border rounded-full">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="p-3"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="p-3"
                >
                  <Plus size={14} />
                </button>
              </div>
              {current && (
                <span className="ml-3 text-sm text-slate-500">
                  {current.stock} em estoque
                </span>
              )}
            </div>

            {/* CTAs */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={outOfStock}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white font-semibold py-4 rounded-full transition"
              >
                Adicionar ao carrinho
              </button>
              <button
                disabled={outOfStock}
                className="bg-[#EC4899] hover:bg-[#DB2777] disabled:opacity-50 text-white font-semibold py-4 rounded-full transition"
              >
                Comprar agora
              </button>
            </div>

            <button className="mt-4 inline-flex items-center gap-2 text-slate-600 hover:text-[#EC4899] text-sm">
              <Heart size={16} /> Adicionar aos favoritos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
