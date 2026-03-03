import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cep: string | null;
  address: string | null;
  created_at: string;
};

export default function AdminCustomers() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Customer[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await cloud
      .from("store_customers")
      .select("id, name, email, phone, cep, address, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">Cadastro automático via compra.</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">Nenhum cliente ainda.</div>
          ) : (
            rows.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                <div className="font-medium">{c.name ?? "—"}</div>
                <div className="text-sm text-muted-foreground">{c.phone ?? ""}{c.email ? ` • ${c.email}` : ""}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
