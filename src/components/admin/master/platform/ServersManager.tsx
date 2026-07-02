import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Server, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ServersManager() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", hostname: "", ip: "", os: "", cpu_cores: 0, ram_mb: 0, disk_gb: 0 });

  const load = () => supabase.from("platform_servers").select("*").order("created_at").then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("platform_servers").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Servidor cadastrado");
    setOpen(false); setForm({ name: "", hostname: "", ip: "", os: "", cpu_cores: 0, ram_mb: 0, disk_gb: 0 });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Servidores</h2>
          <p className="text-sm text-muted-foreground">Inventário de VPS/hosts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar servidor</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Hostname" value={form.hostname} onChange={e => setForm({ ...form, hostname: e.target.value })} />
              <Input placeholder="IP" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} />
              <Input placeholder="OS" value={form.os} onChange={e => setForm({ ...form, os: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="CPU cores" value={form.cpu_cores || ""} onChange={e => setForm({ ...form, cpu_cores: +e.target.value })} />
                <Input type="number" placeholder="RAM MB" value={form.ram_mb || ""} onChange={e => setForm({ ...form, ram_mb: +e.target.value })} />
                <Input type="number" placeholder="Disco GB" value={form.disk_gb || ""} onChange={e => setForm({ ...form, disk_gb: +e.target.value })} />
              </div>
              <Button onClick={save} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Nenhum servidor cadastrado.</Card>}
        {rows.map(s => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="font-semibold">{s.name}</span>
              <Badge variant={s.status === "online" ? "default" : "outline"}>{s.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <div>{s.hostname} · {s.ip}</div>
              <div>{s.os} · {s.cpu_cores} cores · {s.ram_mb}MB · {s.disk_gb}GB</div>
              <div>Heartbeat: {s.last_heartbeat_at ? new Date(s.last_heartbeat_at).toLocaleString() : "—"}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
