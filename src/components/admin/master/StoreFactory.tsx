import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, ArrowLeft, Layers, Palette, Cpu, Globe, Rocket, Store, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/providers/TenantProvider";
import { logSystemEvent } from "@/services/systemLogs";
import { useNavigate } from "react-router-dom";

interface StoreFactoryProps {
  onSuccess: () => void;
}

const StoreFactory = ({ onSuccess }: StoreFactoryProps) => {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    blueprintId: "",
    templateId: "",
    selectedModules: [] as string[],
    domain: "",
    tenantId: ""
  });

  useEffect(() => {
    const checkRole = async () => {
      const { data } = await supabase.rpc('is_master_admin');
      setIsMaster(!!data);
    };
    checkRole();
  }, []);

  const { data: blueprints } = useQuery({
    queryKey: ['factory-blueprints'],
    queryFn: async () => (await supabase.from('store_blueprints').select('*')).data
  });

  const { data: templates } = useQuery({
    queryKey: ['factory-templates'],
    queryFn: async () => (await supabase.from('store_templates').select('*')).data
  });

  const { data: moduleDefs } = useQuery({
    queryKey: ['factory-modules'],
    queryFn: async () => (await supabase.from('store_module_definitions').select('*')).data
  });

  const { data: allTenants } = useQuery({
    queryKey: ['master-all-tenants'],
    queryFn: async () => {
      if (!isMaster) return null;
      const { data } = await supabase.from('tenants').select('id, name').order('name');
      return data;
    },
    enabled: isMaster
  });

  const handleCreateStore = async () => {
    setLoading(true);
    try {
      const currentTenantId = formData.tenantId || tenant?.id || (await supabase.from('tenants').select('id').limit(1).single()).data?.id;
      if (!currentTenantId) throw new Error("Tenant não encontrado");

      // Check Store Limit
      const { count: storeCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenantId);

      // Obter limites do tenant alvo (não necessariamente do logado)
      const { data: targetTenant } = await supabase
        .from('tenants')
        .select(`
          id,
          saas_subscriptions (
            saas_plans (limits)
          )
        `)
        .eq('id', currentTenantId)
        .single();

      const limits = (targetTenant?.saas_subscriptions?.[0]?.saas_plans as any)?.limits;
      const maxStores = limits?.max_stores || 1;
      
      let isOverride = false;
      if (storeCount !== null && storeCount >= maxStores) {
        if (isMaster) {
          isOverride = true;
          toast.info("Override administrativo: Limite do plano ignorado pelo Master.");
        } else {
          throw new Error(`Limite de lojas atingido (${storeCount}/${maxStores}). Faça upgrade do plano.`);
        }
      }

      // 2. Create Store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: formData.name,
          slug: formData.slug,
          tenant_id: currentTenantId,
          blueprint_id: formData.blueprintId,
          active: true
        })
        .select()
        .single();

      if (storeError) throw storeError;

      // 3. Apply Blueprint logic
      const blueprint = blueprints?.find(b => b.id === formData.blueprintId);
      if (blueprint) {
        const { data: latestVersion } = await supabase
          .from('blueprint_versions')
          .select('*')
          .eq('blueprint_id', blueprint.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const config = (latestVersion?.config || blueprint.config) as any;
        
        if (config.categories && Array.isArray(config.categories)) {
          const categories = config.categories.map((cat: any) => ({
            name: typeof cat === 'string' ? cat : cat.name,
            store_id: store.id,
            active: true
          }));
          await supabase.from('store_categories').insert(categories);
        }

        if (config.banners && Array.isArray(config.banners)) {
          const banners = config.banners.map((banner: any) => ({
            ...banner,
            id: undefined,
            store_id: store.id
          }));
          await supabase.from('store_banners').insert(banners);
        }

        if (config.pages && Array.isArray(config.pages)) {
          const pages = config.pages.map((page: any) => ({
            ...page,
            id: undefined,
            store_id: store.id
          }));
          await supabase.from('store_pages').insert(pages);
        }

        if (config.ai_config) {
          await supabase.from('store_ai_configs').insert({
            ...config.ai_config,
            id: undefined,
            store_id: store.id
          });
        }
      }

      // 4. Set Theme
      const template = templates?.find(t => t.id === formData.templateId);
      if (template) {
        await supabase.from('store_themes').insert({
          store_id: store.id,
          colors: (template.theme_config as any).colors,
          fonts: (template.theme_config as any).fonts,
        });
      }

      // 5. Install Modules
      if (formData.selectedModules.length > 0) {
        const modules = formData.selectedModules.map(key => ({
          store_id: store.id,
          module_key: key,
          is_enabled: true
        }));
        await supabase.from('store_modules').insert(modules);
      }

      // 6. Config Domain (Fallback)
      await supabase.from('store_domains').insert({
        store_id: store.id,
        tenant_id: currentTenantId,
        domain: `${store.slug}.lovable.app`,
        is_primary: !formData.domain,
        is_fallback: true,
        verified: true
      });

      // 7. Config Custom Domain if provided
      if (formData.domain) {
        await supabase.from('store_domains').insert({
          store_id: store.id,
          tenant_id: currentTenantId,
          domain: formData.domain,
          is_primary: true,
          verified: false
        });
      }

      // 8. Log Event
      await logSystemEvent({
        event_type: 'store_creation',
        message: `Loja ${store.name} criada${isOverride ? ' com override de limite' : ''}.`,
        metadata: { store_id: store.id, tenant_id: currentTenantId, is_override: isOverride }
      });

      toast.success("Plataforma configurada com sucesso!");
      onSuccess();
      navigate(`/admin/master/stores/${store.id}`);
    } catch (error: any) {
      toast.error("Erro ao criar loja: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Negócio", icon: Layers, description: "Escolha o Blueprint" },
    { id: 2, title: "Visual", icon: Palette, description: "Escolha o Template" },
    { id: 3, title: "Módulos", icon: Cpu, description: "Ative Funcionalidades" },
    { id: 4, title: "Identidade", icon: Globe, description: "Nome e Domínio" },
    { id: 5, title: "Finalizar", icon: Rocket, description: "Revisar e Lançar" }
  ];

  return (
    <div className="flex flex-col min-h-[500px]">
      {tenant?.subscription?.plan && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg flex items-center justify-between border">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Plano {tenant.subscription.plan.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Limites: <strong>{tenant.subscription.plan.limits.max_stores} lojas</strong> • 
              <strong> {tenant.subscription.plan.limits.max_products} produtos</strong>
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Rocket size={14} className="text-primary" /> Upgrade
          </Button>
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between relative mb-2">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex flex-col items-center relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                step >= s.id ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"
              }`}>
                {step > s.id ? <Check size={20} /> : <s.icon size={20} />}
              </div>
              <span className={`text-[10px] mt-2 font-medium ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>
                {s.title}
              </span>
            </div>
          ))}
          <div className="absolute top-5 left-0 w-full h-[2px] bg-muted -z-0" />
          <div className="absolute top-5 left-0 h-[2px] bg-primary transition-all duration-300 -z-0" 
               style={{ width: `${(step - 1) * 25}%` }} />
        </div>
      </div>

      <div className="flex-1">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Qual o tipo do negócio?</h3>
            <div className="grid grid-cols-2 gap-4">
              {blueprints?.map((bp) => (
                <Card 
                  key={bp.id} 
                  className={`cursor-pointer transition-all ${formData.blueprintId === bp.id ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}`}
                  onClick={() => setFormData({ ...formData, blueprintId: bp.id })}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md"><Store size={24} /></div>
                    <div>
                      <p className="font-bold">{bp.name}</p>
                      <p className="text-xs text-muted-foreground">{bp.category}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Escolha a aparência</h3>
            <div className="grid grid-cols-3 gap-4">
              {templates?.map((t) => (
                <Card 
                  key={t.id} 
                  className={`cursor-pointer transition-all ${formData.templateId === t.id ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}`}
                  onClick={() => setFormData({ ...formData, templateId: t.id })}
                >
                  <CardContent className="p-0">
                    <div className="h-24 bg-muted border-b flex items-center justify-center">
                      <Palette size={32} className="opacity-20" />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm">{t.name}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Módulos Instaláveis</h3>
            <div className="grid grid-cols-2 gap-4">
              {moduleDefs?.map((mod) => (
                <Card 
                  key={mod.key} 
                  className={`cursor-pointer transition-all ${formData.selectedModules.includes(mod.key) ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}`}
                  onClick={() => {
                    const exists = formData.selectedModules.includes(mod.key);
                    setFormData({
                      ...formData,
                      selectedModules: exists 
                        ? formData.selectedModules.filter(m => m !== mod.key)
                        : [...formData.selectedModules, mod.key]
                    });
                  }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md"><Cpu size={20} /></div>
                      <div>
                        <p className="font-medium text-sm">{mod.name}</p>
                        <p className="text-[10px] text-muted-foreground">{mod.description}</p>
                      </div>
                    </div>
                    {formData.selectedModules.includes(mod.key) && <Check size={16} className="text-primary" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Identidade da Loja</h3>
            <div className="space-y-4">
              {isMaster && (
                <div className="grid gap-2">
                  <Label>Vincular ao Tenant</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  >
                    <option value="">(Seu Tenant Atual)</option>
                    {allTenants?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Nome da Loja</Label>
                <Input 
                  placeholder="Minha Nova Loja" 
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
                    setFormData({ ...formData, name, slug });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Domínio Customizado (opcional)</Label>
                <Input 
                  placeholder="www.minhaloja.com.br" 
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
              <Rocket size={48} />
            </div>
            <h3 className="text-2xl font-bold">Quase lá!</h3>
            <p className="text-muted-foreground">Tudo pronto para criar a sua nova plataforma multi-loja.</p>
            <div className="mt-6 p-4 bg-muted rounded-lg text-left inline-block w-full max-w-sm">
              <p className="text-sm font-bold mb-2">Resumo:</p>
              <ul className="text-xs space-y-1">
                <li>• Nome: <strong>{formData.name}</strong></li>
                <li>• Blueprint: <strong>{blueprints?.find(b => b.id === formData.blueprintId)?.name}</strong></li>
                <li>• Template: <strong>{templates?.find(t => t.id === formData.templateId)?.name}</strong></li>
                <li>• Módulos: <strong>{formData.selectedModules.length} selecionados</strong></li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8 pt-4 border-t">
        <Button variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1 || loading}>
          <ArrowLeft className="mr-2" size={18} /> Anterior
        </Button>
        {step < 5 ? (
          <Button 
            onClick={() => setStep(s => s + 1)} 
            disabled={
              (step === 1 && !formData.blueprintId) || 
              (step === 2 && !formData.templateId) ||
              (step === 4 && !formData.name)
            }
          >
            Próximo <ArrowRight className="ml-2" size={18} />
          </Button>
        ) : (
          <Button onClick={handleCreateStore} disabled={loading}>
            {loading ? "Criando..." : "Criar Loja Master"} <Check className="ml-2" size={18} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default StoreFactory;
