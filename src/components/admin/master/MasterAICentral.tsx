import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, Wand2, History, Settings2, Bot, MessageSquare, Zap, Target } from "lucide-react";

const MasterAICentral = () => {
  const niches = [
    { name: "Material de Construção", tone: "Técnico e Confiável", goals: "Venda consultiva", icon: Settings2 },
    { name: "Auto Peças", tone: "Pragmático e Ágil", goals: "Localização de peças", icon: Zap },
    { name: "Turismo", tone: "Inspirador e Sonhador", goals: "Conversão de pacotes", icon: Target },
    { name: "Bebidas", tone: "Festivo e Direto", goals: "Recorrência", icon: Sparkles }
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Hub de Inteligência Artificial</h2>
          <p className="text-muted-foreground">O cérebro da plataforma SaaS. Gerencie modelos, nichos e automações cognitivas.</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary animate-pulse">
          <Brain size={14} className="mr-1" /> IA Ativa em 128 lojas
        </Badge>
      </header>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="global">Configuração Global</TabsTrigger>
          <TabsTrigger value="niches">Prompts por Nicho</TabsTrigger>
          <TabsTrigger value="automations">Automações IA</TabsTrigger>
          <TabsTrigger value="logs">Logs & Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-primary" />
                  <CardTitle>Modelos & Conectividade</CardTitle>
                </div>
                <CardDescription>Defina os motores de IA que alimentam a rede.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Modelo de Linguagem (LLM)</Label>
                  <Input placeholder="gpt-4-turbo-preview" defaultValue="gpt-4-turbo-preview" />
                </div>
                <div className="space-y-2">
                  <Label>Modelo de Imagem (Diffusion)</Label>
                  <Input placeholder="dall-e-3" defaultValue="dall-e-3" />
                </div>
                <div className="space-y-2">
                  <Label>System Prompt Base</Label>
                  <Textarea 
                    className="min-h-[120px]"
                    defaultValue="Você é o Master AI da plataforma Builder. Seu objetivo é garantir consistência de marca, SEO otimizado e alta conversão para centenas de lojas multi-tenants."
                  />
                </div>
                <Button className="w-full gap-2">
                  <Settings2 size={16} /> Atualizar Infraestrutura IA
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="text-primary" />
                  <CardTitle>Capacidades da IA</CardTitle>
                </div>
                <CardDescription>O que a IA global consegue acessar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Conhecimento de Produtos", desc: "Acessa catálogo global e estoque" },
                  { label: "Análise de Pedidos", desc: "Identifica padrões de fraude e churn" },
                  { label: "SEO Engine", desc: "Gera sitemaps e meta tags dinâmicas" },
                  { label: "Suporte Multi-loja", desc: "Atendimento em 24/7 para qualquer tenant" }
                ].map((cap) => (
                  <div key={cap.label} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{cap.label}</p>
                      <p className="text-xs text-muted-foreground">{cap.desc}</p>
                    </div>
                    <Badge variant="secondary">Habilitado</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="niches" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {niches.map((niche) => (
              <Card key={niche.name} className="hover:border-primary transition-colors cursor-pointer group">
                <CardHeader className="pb-2">
                  <niche.icon className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <CardTitle className="text-lg">{niche.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs">
                    <p className="text-muted-foreground">Tom de Voz</p>
                    <p className="font-medium">{niche.tone}</p>
                  </div>
                  <div className="text-xs">
                    <p className="text-muted-foreground">Objetivo Principal</p>
                    <p className="font-medium">{niche.goals}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-4 border border-dashed">
                    Configurar Prompt
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="automations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Cognitiva</CardTitle>
              <CardDescription>Automações que disparam ações baseadas em eventos da rede.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { trigger: "Novo Produto Cadastrado", action: "Gerar Descrição IA & SEO", active: true },
                  { trigger: "Pedido Acima de R$ 5.000", action: "Gerar Mensagem WhatsApp VIP", active: true },
                  { trigger: "Baixo Acesso em Loja (7d)", action: "Sugerir Campanha de Banners", active: false },
                  { trigger: "Link de Imagem Quebrado", action: "Tentar Recuperar via Cache IA", active: true }
                ].map((auto) => (
                  <div key={auto.trigger} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Zap size={20} className={auto.active ? "text-yellow-500" : "text-muted-foreground"} />
                      <div>
                        <p className="font-medium">{auto.trigger}</p>
                        <p className="text-sm text-muted-foreground">Ação: {auto.action}</p>
                      </div>
                    </div>
                    <Badge variant={auto.active ? "default" : "secondary"}>{auto.active ? "Ativo" : "Pausado"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Fluxo de Tokens em Tempo Real</CardTitle>
                  <CardDescription>Uso cumulativo de IA por todos os tenants.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <History size={14} /> Exportar Relatório
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <MessageSquare size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Geração de FAQ para Loja #0{i}</p>
                        <p className="text-xs text-muted-foreground">Há {i * 2} minutos • gpt-4-turbo</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">128 tokens</p>
                      <p className="text-[10px] text-green-600">Sucesso</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterAICentral;
