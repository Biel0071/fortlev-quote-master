import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Boxes,
  Ticket,
  Image as ImageIcon,
  Settings,
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

const brl = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "produtos", label: "Produtos", icon: Package },
  { key: "pedidos", label: "Pedidos", icon: ShoppingCart },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "estoque", label: "Estoque", icon: Boxes },
  { key: "cupons", label: "Cupons", icon: Ticket },
  { key: "banners", label: "Banners", icon: ImageIcon },
  { key: "config", label: "Configurações", icon: Settings },
] as const;

type Section = (typeof NAV)[number]["key"];

const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function FashionAdmin() {
  const [section, setSection] = useState<Section>("dashboard");
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    cloud
      .from("stores")
      .select("id")
      .eq("slug", "moda-fashion")
      .maybeSingle()
      .then(({ data }: any) => setStoreId(data?.id ?? null));
  }, []);

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Carregando loja…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-5 border-b">
          <Link
            to="/loja/moda-fashion"
            className="text-lg font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent"
          >
            Moda Fashion
          </Link>
          <div className="text-xs text-slate-500 mt-1">Painel administrativo</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = section === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <Link
          to="/loja/moda-fashion"
          className="p-4 text-xs text-slate-500 flex items-center gap-2 hover:text-[#8B5CF6] border-t"
        >
          <ArrowLeft size={14} /> Voltar à loja
        </Link>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-x-hidden">
        {section === "dashboard" && <DashboardView storeId={storeId} />}
        {section === "produtos" && <ProductsView storeId={storeId} />}
        {section === "pedidos" && <OrdersView storeId={storeId} />}
        {section === "clientes" && <CustomersView storeId={storeId} />}
        {section === "estoque" && <StockView storeId={storeId} />}
        {section === "cupons" && <CouponsView storeId={storeId} />}
        {section === "banners" && <BannersView storeId={storeId} />}
        {section === "config" && <SettingsView />}
      </main>
    </div>
  );
}

/* ============ DASHBOARD ============ */
function DashboardView({ storeId }: { storeId: string }) {
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0,
    customers: 0,
    products: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [chart, setChart] = useState<{ day: string; total: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [orders, customers, products] = await Promise.all([
        cloud.from("fashion_orders").select("total,created_at").eq("store_id", storeId),
        cloud.from("fashion_customers").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        cloud.from("fashion_products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
      ]);
      const rows = (orders.data ?? []) as any[];
      const revenue = rows.reduce((a, r) => a + Number(r.total || 0), 0);
      setStats({
        orders: rows.length,
        revenue,
        customers: (customers as any).count ?? 0,
        products: (products as any).count ?? 0,
      });

      // 7 day chart
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      rows.forEach((r) => {
        const k = String(r.created_at).slice(0, 10);
        if (k in days) days[k] += Number(r.total || 0);
      });
      setChart(
        Object.entries(days).map(([day, total]) => ({
          day: day.slice(5),
          total,
        })),
      );

      const { data: rec } = await cloud
        .from("fashion_orders")
        .select("id,total,status,created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecent(rec ?? []);
    })();
  }, [storeId]);

  const max = Math.max(1, ...chart.map((c) => c.total));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Faturamento" value={brl(stats.revenue)} accent="#8B5CF6" />
        <StatCard label="Pedidos" value={String(stats.orders)} accent="#EC4899" />
        <StatCard label="Clientes" value={String(stats.customers)} accent="#6366F1" />
        <StatCard label="Produtos" value={String(stats.products)} accent="#F472B6" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-4">Faturamento — últimos 7 dias</h3>
          <div className="flex items-end gap-2 h-48">
            {chart.map((c) => (
              <div key={c.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#8B5CF6] to-[#EC4899]"
                  style={{ height: `${(c.total / max) * 100}%`, minHeight: 4 }}
                  title={brl(c.total)}
                />
                <div className="text-[10px] text-slate-500">{c.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-4">Pedidos recentes</h3>
          <div className="space-y-2">
            {recent.length === 0 && (
              <div className="text-sm text-slate-500">Nenhum pedido ainda.</div>
            )}
            {recent.map((r) => (
              <div key={r.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                <div>
                  <div className="font-mono text-xs">{r.id.slice(0, 8)}</div>
                  <div className="text-xs text-slate-500">{r.status}</div>
                </div>
                <div className="font-semibold">{brl(r.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

/* ============ PRODUCTS ============ */
function ProductsView({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await cloud
      .from("fashion_products")
      .select("id,name,slug,category,price,promo_price,active,badge")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [storeId]);

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    await cloud.from("fashion_products").delete().eq("id", id);
    load();
  };

  const save = async (p: any) => {
    if (p.id) {
      await cloud
        .from("fashion_products")
        .update({
          name: p.name,
          slug: p.slug,
          category: p.category,
          price: Number(p.price),
          promo_price: p.promo_price ? Number(p.promo_price) : null,
          badge: p.badge || null,
          active: !!p.active,
        })
        .eq("id", p.id);
    } else {
      await cloud.from("fashion_products").insert({
        store_id: storeId,
        name: p.name,
        slug: p.slug,
        category: p.category || "feminino",
        price: Number(p.price || 0),
        promo_price: p.promo_price ? Number(p.promo_price) : null,
        badge: p.badge || null,
        active: true,
        gallery: ["linear-gradient(135deg,#8B5CF6,#EC4899)"],
      });
    }
    setEditing(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <button
          onClick={() =>
            setEditing({
              name: "",
              slug: "",
              category: "feminino",
              price: 0,
              promo_price: "",
              badge: "",
              active: true,
            })
          }
          className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={16} /> Novo produto
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Status</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Carregando…
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 capitalize">{p.category}</td>
                <td className="p-3">{brl(p.promo_price ?? p.price)}</td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="p-1.5 hover:bg-slate-100 rounded"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar produto" : "Novo produto"} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <TextField label="Nome" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <TextField
              label="Slug"
              value={editing.slug}
              onChange={(v) => setEditing({ ...editing, slug: v.replace(/\s+/g, "-").toLowerCase() })}
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Categoria"
                value={editing.category}
                options={["feminino", "masculino", "infantil", "acessorios"]}
                onChange={(v) => setEditing({ ...editing, category: v })}
              />
              <SelectField
                label="Badge"
                value={editing.badge || ""}
                options={["", "Novo", "Oferta"]}
                onChange={(v) => setEditing({ ...editing, badge: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Preço"
                value={String(editing.price)}
                onChange={(v) => setEditing({ ...editing, price: v })}
              />
              <TextField
                label="Preço promocional"
                value={String(editing.promo_price ?? "")}
                onChange={(v) => setEditing({ ...editing, promo_price: v })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Ativo
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button
                onClick={() => save(editing)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold"
              >
                Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ ORDERS ============ */
function OrdersView({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const load = async () => {
    const { data } = await cloud
      .from("fashion_orders")
      .select("id,status,total,payment_method,tracking_code,created_at,customer_id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  };
  useEffect(() => {
    load();
  }, [storeId]);

  const setStatus = async (id: string, status: string) => {
    await cloud.from("fashion_orders").update({ status }).eq("id", id);
    load();
  };
  const setTracking = async (id: string, tracking_code: string) => {
    await cloud.from("fashion_orders").update({ tracking_code }).eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Data</th>
              <th className="p-3">Pagamento</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Rastreio</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="p-3">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 uppercase text-xs">{o.payment_method}</td>
                <td className="p-3 font-semibold">{brl(o.total)}</td>
                <td className="p-3">
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <input
                    defaultValue={o.tracking_code || ""}
                    onBlur={(e) => setTracking(o.id, e.target.value)}
                    placeholder="Código"
                    className="border rounded px-2 py-1 text-xs w-32"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ CUSTOMERS ============ */
function CustomersView({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    cloud
      .from("fashion_customers")
      .select("id,name,email,phone,cep,created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setItems(data ?? []));
  }, [storeId]);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Clientes</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">CEP</th>
              <th className="p-3">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Nenhum cliente ainda.
                </td>
              </tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">{c.cep}</td>
                <td className="p-3">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ STOCK ============ */
function StockView({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data: products } = await cloud
      .from("fashion_products")
      .select("id,name")
      .eq("store_id", storeId);
    const ids = (products ?? []).map((p: any) => p.id);
    if (ids.length === 0) return setRows([]);
    const { data: vs } = await cloud
      .from("fashion_variants")
      .select("id,product_id,size,color,color_hex,stock,sku")
      .in("product_id", ids)
      .order("stock", { ascending: true });
    const nameMap = Object.fromEntries((products ?? []).map((p: any) => [p.id, p.name]));
    setRows((vs ?? []).map((v: any) => ({ ...v, productName: nameMap[v.product_id] })));
  };
  useEffect(() => {
    load();
  }, [storeId]);

  const updateStock = async (id: string, stock: number) => {
    await cloud.from("fashion_variants").update({ stock }).eq("id", id);
    load();
  };

  const lowStock = useMemo(() => rows.filter((r) => r.stock < 5).length, [rows]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Estoque</h1>
        {lowStock > 0 && (
          <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full text-sm">
            <AlertTriangle size={14} /> {lowStock} variantes com estoque baixo
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Tamanho</th>
              <th className="p-3">Cor</th>
              <th className="p-3">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className={`border-t ${v.stock < 5 ? "bg-orange-50/50" : ""}`}>
                <td className="p-3 font-medium">{v.productName}</td>
                <td className="p-3 font-mono text-xs">{v.sku}</td>
                <td className="p-3">{v.size}</td>
                <td className="p-3 flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border"
                    style={{ background: v.color_hex }}
                  />
                  {v.color}
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    defaultValue={v.stock}
                    onBlur={(e) => updateStock(v.id, Number(e.target.value))}
                    className={`w-20 border rounded px-2 py-1 ${
                      v.stock < 5 ? "border-orange-400 text-orange-600 font-semibold" : ""
                    }`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ COUPONS ============ */
function CouponsView({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent",
    discount_value: "",
    min_subtotal: "",
  });
  const load = async () => {
    const { data } = await cloud
      .from("fashion_coupons")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => {
    load();
  }, [storeId]);

  const add = async () => {
    if (!form.code) return;
    await cloud.from("fashion_coupons").insert({
      store_id: storeId,
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value || 0),
      min_subtotal: Number(form.min_subtotal || 0),
      active: true,
    });
    setForm({ code: "", discount_type: "percent", discount_value: "", min_subtotal: "" });
    load();
  };

  const toggle = async (c: any) => {
    await cloud.from("fashion_coupons").update({ active: !c.active }).eq("id", c.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir cupom?")) return;
    await cloud.from("fashion_coupons").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cupons</h1>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 grid md:grid-cols-5 gap-3 items-end">
        <TextField label="Código" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
        <SelectField
          label="Tipo"
          value={form.discount_type}
          options={["percent", "fixed"]}
          onChange={(v) => setForm({ ...form, discount_type: v })}
        />
        <TextField
          label="Valor"
          value={form.discount_value}
          onChange={(v) => setForm({ ...form, discount_value: v })}
        />
        <TextField
          label="Mín. subtotal"
          value={form.min_subtotal}
          onChange={(v) => setForm({ ...form, min_subtotal: v })}
        />
        <button
          onClick={add}
          className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold rounded-lg py-2"
        >
          Adicionar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Desconto</th>
              <th className="p-3">Mín. subtotal</th>
              <th className="p-3">Ativo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">
                  {c.discount_type === "percent"
                    ? `${c.discount_value}%`
                    : brl(c.discount_value)}
                </td>
                <td className="p-3">{brl(c.min_subtotal)}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggle(c)}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      c.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {c.active ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => remove(c.id)} className="text-red-500">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ BANNERS ============ */
function BannersView({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    gradient: "linear-gradient(135deg,#8B5CF6,#EC4899)",
    cta_label: "Comprar",
    link_url: "/loja/moda-fashion",
  });
  const load = async () => {
    const { data } = await cloud
      .from("fashion_banners")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });
    setItems(data ?? []);
  };
  useEffect(() => {
    load();
  }, [storeId]);

  const add = async () => {
    if (!form.title) return;
    await cloud.from("fashion_banners").insert({ ...form, store_id: storeId, active: true });
    setForm({ ...form, title: "", subtitle: "" });
    load();
  };
  const remove = async (id: string) => {
    await cloud.from("fashion_banners").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Banners</h1>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 grid md:grid-cols-2 gap-3">
        <TextField label="Título" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <TextField label="Subtítulo" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
        <TextField label="Gradiente CSS" value={form.gradient} onChange={(v) => setForm({ ...form, gradient: v })} />
        <TextField label="Rótulo do botão" value={form.cta_label} onChange={(v) => setForm({ ...form, cta_label: v })} />
        <TextField label="Link" value={form.link_url} onChange={(v) => setForm({ ...form, link_url: v })} />
        <button
          onClick={add}
          className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold rounded-lg py-2 md:col-span-2"
        >
          Adicionar banner
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-32" style={{ background: b.gradient }} />
            <div className="p-4">
              <div className="font-bold">{b.title}</div>
              <div className="text-sm text-slate-500">{b.subtitle}</div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-slate-400">{b.cta_label}</span>
                <button onClick={() => remove(b.id)} className="text-red-500 text-sm">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ SETTINGS ============ */
function SettingsView() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm max-w-2xl space-y-4">
        <div>
          <label className="text-sm font-semibold">Nome da loja</label>
          <input
            defaultValue="Moda Fashion Store"
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Cor primária</label>
          <div className="flex gap-2 mt-1 items-center">
            <input defaultValue="#8B5CF6" className="border rounded-lg px-3 py-2 w-32" />
            <span className="w-8 h-8 rounded-full" style={{ background: "#8B5CF6" }} />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold">Cor de destaque</label>
          <div className="flex gap-2 mt-1 items-center">
            <input defaultValue="#EC4899" className="border rounded-lg px-3 py-2 w-32" />
            <span className="w-8 h-8 rounded-full" style={{ background: "#EC4899" }} />
          </div>
        </div>
        <button className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-semibold px-6 py-2 rounded-full">
          Salvar
        </button>
      </div>
    </div>
  );
}

/* ============ Shared UI ============ */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
    </div>
  );
}
