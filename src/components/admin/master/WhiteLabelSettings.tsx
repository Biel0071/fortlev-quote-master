import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Globe, Palette, ShieldCheck, Mail, Phone, ExternalLink } from "lucide-react";

const WhiteLabelSettings = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Configurações salvas",
        description: "As definições de White Label foram atualizadas com sucesso.",
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">White Label & Branding</h2>
        <p className="text-muted-foreground">Configure a identidade visual da plataforma para seus clientes.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="text-primary" size={20} /> Identidade Visual
            </CardTitle>
            <CardDescription>Nome, logo e cores da plataforma principal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Nome da Plataforma</Label>
              <Input id="platform-name" defaultValue="Master Builder SaaS" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input id="primary-color" type="color" defaultValue="#3b82f6" className="w-12 p-1 h-10" />
                  <Input defaultValue="#3b82f6" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input id="secondary-color" type="color" defaultValue="#1e293b" className="w-12 p-1 h-10" />
                  <Input defaultValue="#1e293b" className="flex-1" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-url">URL do Logo</Label>
              <Input id="logo-url" placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="text-primary" size={20} /> Domínio Customizado
            </CardTitle>
            <CardDescription>Acesse o painel administrativo através do seu próprio domínio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-domain">Domínio Principal</Label>
              <div className="flex gap-2">
                <Input id="custom-domain" placeholder="admin.suaempresa.com" />
                <Button variant="outline">Verificar</Button>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
              <p className="font-bold">Configuração DNS:</p>
              <p>Tipo: <span className="text-primary">CNAME</span></p>
              <p>Host: <span className="text-primary">admin</span></p>
              <p>Valor: <span className="text-primary">master-builder.lovable.app</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} /> Suporte & Institucional
            </CardTitle>
            <CardDescription>Links e informações de contato exibidas para os lojistas.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail size={14} /> E-mail de Suporte</Label>
                <Input placeholder="suporte@seu-saas.com" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone size={14} /> WhatsApp de Suporte</Label>
                <Input placeholder="+55 11 99999-9999" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ExternalLink size={14} /> Termos de Uso</Label>
                <Input placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ShieldCheck size={14} /> Política de Privacidade</Label>
                <Input placeholder="https://..." />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default WhiteLabelSettings;