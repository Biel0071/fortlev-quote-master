import React, { useState, useEffect } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/contexts/StoreContext";

export default function AdminDebugLeads() {
  const { activeStoreId } = useStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    sources: {} as Record<string, number>
  });

  useEffect(() => {
    async function fetchDebug() {
      try {
        const { data: contacts, error: fetchError } = await cloud
          .from("store_customer_contacts")
          .select("*")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        setData(contacts || []);
        
        const sourceStats = (contacts || []).reduce((acc: any, curr: any) => {
          acc[curr.source] = (acc[curr.source] || 0) + 1;
          return acc;
        }, {});

        setStats({
          total: contacts?.length || 0,
          sources: sourceStats
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDebug();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Debug de Leads Consolidados</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Consolidado</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        {Object.entries(stats.sources).map(([source, count]) => (
          <Card key={source}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{source}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{count as number}</div></CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <strong>Erro na consulta:</strong> {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Lista de Contatos (View: store_customer_contacts)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/Documento</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center">Nenhum registro encontrado na view.</TableCell></TableRow>
              ) : data.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.document || item.email || item.phone}</TableCell>
                  <TableCell><Badge variant="outline">{item.source}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
