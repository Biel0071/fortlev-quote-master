import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  whatsapp: string | null;
  cpf_cnpj: string | null;
  address_line: string | null;
  cep: string | null;
};

export default function AccountPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, loading: sessionLoading } = useSession();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [cep, setCep] = useState("");
  const [saving, setSaving] = useState(false);

  const redirectTo = useMemo(() => {
    const from = (location.state as any)?.from;
    return typeof from === "string" ? from : "/conta";
  }, [location.state]);

  const loadProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { data, error } = await cloud
      .from("customer_profiles")
      .select("id, user_id, full_name, whatsapp, cpf_cnpj, address_line, cep")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setProfileLoading(false);
      return;
    }

    setProfile((data as any) ?? null);
    setProfileLoading(false);
  };

  useEffect(() => {
    if (user) loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setWhatsapp(profile.whatsapp ?? "");
    setCpfCnpj(profile.cpf_cnpj ?? "");
    setAddressLine(profile.address_line ?? "");
    setCep(profile.cep ?? "");
  }, [profile]);

  const onAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (mode === "login") {
        const { error } = await cloud.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav(redirectTo, { replace: true });
      } else {
        const { error } = await cloud.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: "Conta criada",
          description: "Verifique seu email para confirmar e então faça login.",
        });
        setMode("login");
      }
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha no acesso", variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (!profile) {
        const { data, error } = await cloud
          .from("customer_profiles")
          .insert({
            user_id: user.id,
            full_name: fullName || null,
            whatsapp: whatsapp || null,
            cpf_cnpj: cpfCnpj || null,
            address_line: addressLine || null,
            cep: cep || null,
          } as any)
          .select("id, user_id, full_name, whatsapp, cpf_cnpj, address_line, cep")
          .single();
        if (error) throw error;
        setProfile(data as any);
      } else {
        const { data, error } = await cloud
          .from("customer_profiles")
          .update({
            full_name: fullName || null,
            whatsapp: whatsapp || null,
            cpf_cnpj: cpfCnpj || null,
            address_line: addressLine || null,
            cep: cep || null,
          } as any)
          .eq("user_id", user.id)
          .select("id, user_id, full_name, whatsapp, cpf_cnpj, address_line, cep")
          .single();
        if (error) throw error;
        setProfile(data as any);
      }

      toast({ title: "Dados salvos" });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await cloud.auth.signOut();
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />

      <main className="main-content max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
            <p className="text-sm text-muted-foreground">Acesse seus dados, pedidos e rastreio.</p>
          </div>
          {user ? (
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/pedidos">Meus pedidos</Link>
              </Button>
              <Button variant="ghost" onClick={signOut}>
                Sair
              </Button>
            </div>
          ) : null}
        </header>

        {sessionLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Carregando...</CardContent>
          </Card>
        ) : !user ? (
          <Card>
            <CardHeader>
              <CardTitle>Entrar ou criar conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>
                <TabsContent value={mode}>
                  <form onSubmit={onAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
                    </div>
                    <Button className="w-full" type="submit" disabled={authLoading}>
                      {authLoading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="text-xs text-muted-foreground">
                Ao criar conta, você precisa confirmar o e-mail antes de entrar.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Dados pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando seus dados...</div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email ?? ""} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(DDD) 9xxxx-xxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF/CNPJ</Label>
                    <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} placeholder="Opcional" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Rua, número, bairro" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                  </div>
                </div>

                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar dados"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acesso rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/pedidos">📦 Meus pedidos</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/loja">🛒 Ver catálogo</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
