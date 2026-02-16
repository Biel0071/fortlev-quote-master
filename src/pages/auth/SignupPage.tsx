import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await cloud.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Conta criada",
      description: "Verifique seu email para confirmar e então faça login.",
    });

    nav("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
            </Button>
            <div className="text-sm text-muted-foreground">
              Já tem conta? <Link to="/auth/login" className="underline">Entrar</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
