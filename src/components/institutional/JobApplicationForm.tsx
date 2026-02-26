import { useMemo, useState } from "react";
import { z } from "zod";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(255),
  area_of_interest: z.string().trim().min(2).max(80),
  experience: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function JobApplicationForm() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [state, setState] = useState<FormState>({
    full_name: "",
    phone: "",
    email: "",
    area_of_interest: "",
    experience: "",
    notes: "",
  });

  const canSubmit = useMemo(() => {
    const ok = schema.safeParse(state).success;
    return ok && !loading;
  }, [state, loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = schema.safeParse(state);
    if (!parsed.success) {
      toast({
        title: "Verifique os campos",
        description: parsed.error.issues[0]?.message ?? "Dados inválidos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let resume_path: string | null = null;

      if (resumeFile) {
        const ext = resumeFile.name.includes(".") ? resumeFile.name.split(".").pop() : "pdf";
        const path = `public/${Date.now()}-${safeFileName(parsed.data.full_name)}.${safeFileName(String(ext ?? "pdf"))}`;

        const { error: upErr } = await cloud.storage.from("talent-resumes").upload(path, resumeFile, {
          upsert: false,
          contentType: resumeFile.type || undefined,
        });
        if (upErr) throw upErr;

        resume_path = path;
      }

      const { error: dbErr } = await cloud.from("talent_applications").insert({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        area_of_interest: parsed.data.area_of_interest,
        experience: parsed.data.experience ? parsed.data.experience : null,
        notes: parsed.data.notes ? parsed.data.notes : null,
        resume_path,
        metadata: { source: "web" },
      } as any);

      if (dbErr) throw dbErr;

      toast({ title: "Candidatura enviada", description: "Recebemos seus dados e entraremos em contato se houver oportunidade." });
      setState({ full_name: "", phone: "", email: "", area_of_interest: "", experience: "", notes: "" });
      setResumeFile(null);
    } catch (err) {
      toast({
        title: "Erro ao enviar",
        description: err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Trabalhe conosco</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={state.full_name} onChange={(e) => setState((s) => ({ ...s, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={state.phone} onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={state.email}
                onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
                type="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Área de interesse</Label>
              <Input
                value={state.area_of_interest}
                onChange={(e) => setState((s) => ({ ...s, area_of_interest: e.target.value }))}
                placeholder="Ex.: Vendas, Logística, Estoque"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Experiência</Label>
            <Textarea
              value={state.experience ?? ""}
              onChange={(e) => setState((s) => ({ ...s, experience: e.target.value }))}
              placeholder="Descreva resumidamente sua experiência"
            />
          </div>

          <div className="space-y-2">
            <Label>Currículo (upload)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
            <div className="text-xs text-muted-foreground">Formatos aceitos: PDF, DOC, DOCX.</div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={state.notes ?? ""}
              onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Conte o que considerar relevante"
            />
          </div>

          <Button className="w-full h-12 rounded-2xl" type="submit" disabled={!canSubmit}>
            {loading ? "Enviando..." : "Enviar candidatura"}
          </Button>

          <div className="text-xs text-muted-foreground leading-relaxed">
            Ao enviar, você concorda com o tratamento dos dados para fins de recrutamento e seleção, conforme nossa Política de
            Privacidade.
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
