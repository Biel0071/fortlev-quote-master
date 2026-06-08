import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Wand2, History, Settings2 } from "lucide-react";

const MasterAICentral = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">IA Central</h2>
        <p className="text-muted-foreground">Configurações globais de Inteligência Artificial para as lojas.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary" />
              <CardTitle>Configuração Global de IA</CardTitle>
            </div>
            <CardDescription>Defina os modelos e tokens padrão para novas lojas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo Padrão</Label>
              <Input placeholder="gpt-4-turbo" defaultValue="gpt-4-turbo" />
            </div>
            <div className="space-y-2">
              <Label>System Prompt Base</Label>
              <Textarea 
                placeholder="Você é um assistente de e-commerce..." 
                className="min-h-[100px]"
                defaultValue="Você é um assistente especialista em e-commerce para a plataforma Builder SaaS. Seu objetivo é ajudar o lojista a vender mais."
              />
            </div>
            <Button className="w-full gap-2">
              <Settings2 size={16} /> Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="text-primary" />
              <CardTitle>Logs de Geração</CardTitle>
            </div>
            <CardDescription>Monitore o uso de IA em toda a plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">Geração de Produto</p>
                    <p className="text-xs text-muted-foreground">Loja: Exemplo {i} • 450 tokens</p>
                  </div>
                  <Badge variant="outline">Sucesso</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ferramentas de IA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Wand2 size={24} />
              Gerar Blueprints
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Brain size={24} />
              Otimizar SEO Global
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Sparkles size={24} />
              Tradutor de Módulos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterAICentral;
