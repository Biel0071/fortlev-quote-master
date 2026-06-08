import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Store, Globe, ShieldCheck, Cpu, Sparkles, Zap, Activity, Layers, 
  CreditCard, Palette, ExternalLink, ArrowLeft, RefreshCcw, Settings, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { storeUrlService } from "@/services/url/storeUrlService";


const StoreDetails = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: store, isLoading } = useQuery({
    queryKey: ['master-store-detail', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          tenants (
            id,
            name,
            saas_subscriptions (
              status,
              saas_plans (*)
            )
          ),
          store_domains (*),
          store_modules (*),
          store_ai_configs (*),
          store_blueprints (name)
        `)
        .eq('id', storeId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center">Carregando detalhes da loja...</div>;
  if (!store) return <div className="p-8 text-center">Loja não encontrada.</div>;

  const publicUrl = storeUrlService.getStorePublicUrl(store, store.store_domains);
  const adminUrl = storeUrlService.getStoreAdminUrl(store.id);
  const subscription = store.tenants?.saas_subscriptions?.[0];
  const hasPlan = !!subscription?.saas_plans;


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/master/stores')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{store.name}</h2>
            <Badge variant={store.active ? "default" : "secondary"}>
              {store.active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
          <p className="text-muted-foreground">ID: {store.id} • Slug: /{store.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.open(publicUrl, '_blank')}>
            <ExternalLink size={16} /> Ver Site
          </Button>
          <Button className="gap-2" onClick={() => navigate(adminUrl)}>
            <ShieldCheck size={16} /> Entrar no Admin
          </Button>

        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="domains">Domínios</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="ia">IA & Configs</TabsTrigger>
          <TabsTrigger value="plan">Plano & White Label</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Domínio Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold break-all truncate" title={publicUrl}>{publicUrl.replace('https://', '')}</div>

                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setActiveTab("domains")}>
                  Gerenciar todos os domínios
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${!hasPlan ? "text-destructive" : ""}`}>
                  {subscription?.saas_plans?.name || "Sem Plano Ativo"}
                </div>
                {!hasPlan ? (
                  <Button variant="link" className="p-0 h-auto text-xs text-destructive gap-1" onClick={() => navigate(`/admin/master/plans?tenantId=${store.tenant_id}`)}>
                    <AlertCircle size={10} /> Vincular plano agora
                  </Button>
                ) : (
                  <Badge variant="outline" className="mt-1">{subscription?.status || "Inativo"}</Badge>
                )}

              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Blueprint Base</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{store.store_blueprints?.name || "Custom"}</div>
                <p className="text-xs text-muted-foreground mt-1">Criada em {new Date(store.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Negócio</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium">{store.tenants?.name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Segmento:</span>
                  <span className="font-medium uppercase">{store.segment || "Geral"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Módulos Ativos:</span>
                  <span className="font-medium">{store.store_modules?.length || 0}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">URL Interna:</span>
                  <code className="text-[10px] bg-muted px-1">/p/{store.slug}</code>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Admin:</span>
                  <code className="text-[10px] bg-muted px-1">/admin/store/{store.id}</code>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Status do Sistema:</span>
                  <Badge className="bg-green-500 h-4 text-[10px]">OPERACIONAL</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
           <Card>
            <CardHeader>
              <CardTitle>Domínios da Loja</CardTitle>
              <CardDescription>Gerencie o acesso público desta loja.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Domínios Configurados</h4>
                  <div className="space-y-2">
                    {store.store_domains?.filter((d: any) => !d.is_fallback).map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-accent/5">
                        <div className="flex items-center gap-3">
                          <Globe size={18} className="text-primary" />
                          <div>
                            <p className="font-medium">{d.domain}</p>
                            <div className="flex gap-2 mt-1">
                              {d.is_primary && <Badge variant="default" className="text-[10px] h-4">Principal</Badge>}
                              <Badge variant={d.verified ? "default" : "destructive"} className={`text-[10px] h-4 ${d.verified ? "bg-green-500" : ""}`}>
                                {d.verified ? "Verificado" : "Pendente"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => window.open(`https://${d.domain}`, '_blank')}>
                            <ExternalLink size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!store.store_domains || store.store_domains.filter((d: any) => !d.is_fallback).length === 0) && (
                      <p className="text-xs text-muted-foreground italic border p-3 rounded-lg border-dashed">Nenhum domínio customizado vinculado.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Ambiente de Preview (Lovable)</h4>
                  <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap size={18} className="text-amber-500" />
                      <div>
                        <p className="text-xs font-mono">{publicUrl}</p>
                        <p className="text-[10px] text-muted-foreground">Use esta URL para testar a loja internamente.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, '_blank')}>
                      Abrir Preview
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>

          </Card>
        </TabsContent>
        
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Módulos Instalados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {store.store_modules?.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Cpu size={18} className="text-primary" />
                      <span className="font-medium">{m.module_key}</span>
                    </div>
                    <Badge variant={m.is_enabled ? "default" : "secondary"}>
                      {m.is_enabled ? "Ativo" : "Desativado"}
                    </Badge>
                  </div>
                ))}
                {store.store_modules?.length === 0 && (
                  <p className="col-span-full text-center py-8 text-muted-foreground italic">Nenhum módulo instalado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ia">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de IA</CardTitle>
            </CardHeader>
            <CardContent>
              {store.store_ai_configs?.[0] ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Prompt do Sistema</Label>
                    <div className="p-3 bg-muted rounded-md text-sm italic">
                      {store.store_ai_configs[0].system_prompt}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Modelo:</span>
                      <span className="font-medium">{store.store_ai_configs[0].model_name || "GPT-4o"}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Tokens Usados:</span>
                      <span className="font-medium">1,250</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles size={48} className="mx-auto text-muted/20 mb-4" />
                  <p className="text-muted-foreground">IA não configurada para esta loja.</p>
                  <Button variant="outline" className="mt-4">Configurar IA agora</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logs de Auditoria</CardTitle>
                <CardDescription>Histórico de operações realizadas nesta loja.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-2">
                <RefreshCcw size={14} /> Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border-b text-sm">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">INFO</Badge>
                  <span className="flex-1">Loja criada via Store Factory Master</span>
                  <span className="text-xs text-muted-foreground">{new Date(store.created_at).toLocaleString()}</span>
                </div>
                <div className="text-center py-4">
                   <p className="text-xs text-muted-foreground italic">Integração com system_event_logs carregando...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StoreDetails;
