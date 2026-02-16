import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "store_support_prompt_seen_v1";

function defaultSystemPrompt() {
  return [
    "Você é um atendente virtual de uma loja de materiais de construção.",
    "Responda de forma curta, objetiva e orientada a conversão.",
    "Se a pergunta for sobre: prazo, frete, pagamento, retirada, devolução, garantia — responda de forma prática.",
    "Quando faltar informação (cidade/CEP/produto), peça 1 pergunta de cada vez.",
  ].join(" ");
}

async function askAI(history: Msg[], userText: string) {
  const { data, error } = await cloud.functions.invoke("store-chat", {
    body: {
      system: defaultSystemPrompt(),
      messages: history,
      input: userText,
    },
  });

  if (error) {
    const status = (error as any)?.context?.status;
    if (status === 429) throw new Error("Atendimento ocupado no momento. Tente novamente em instantes.");
    if (status === 402) throw new Error("Atendimento indisponível por limite de uso. Tente novamente mais tarde.");
    throw new Error(error.message || "Falha ao conectar ao atendimento.");
  }

  return String((data as any)?.answer ?? "");
}

export function StoreSupportChat({
  waHref,
  className,
}: {
  waHref: string;
  className?: string;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setChatOpen(true);
    window.addEventListener("store:chat-open", onOpen as any);
    return () => window.removeEventListener("store:chat-open", onOpen as any);
  }, []);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Oi 👋 posso te ajudar a comprar ou acompanhar pedido?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const canShowPrompt = useMemo(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) !== "1";
  }, []);

  useEffect(() => {
    if (!canShowPrompt) return;

    const t = window.setTimeout(() => {
      if (!chatOpen) setPromptOpen(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, 8000);

    return () => window.clearTimeout(t);
  }, [canShowPrompt, chatOpen]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    setErr("");
    setInput("");

    const history = messagesRef.current.slice();
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    setLoading(true);
    try {
      const answer = await askAI(history, text);
      setMessages((prev) => [...prev, { role: "assistant", content: answer || "" }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Prompt */}
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className={cn("sm:max-w-md", className)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Precisa de ajuda?
            </DialogTitle>
            <DialogDescription>
              Oi 👋 posso te ajudar a comprar ou acompanhar pedido?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => {
                setPromptOpen(false);
                setChatOpen(true);
                // dica rápida: ofertas
                setInput("Quero ver as ofertas da semana");
              }}
            >
              Ver ofertas
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setPromptOpen(false);
                setChatOpen(true);
                setInput("Quero calcular frete. Meu CEP é ");
              }}
            >
              Calcular frete
            </Button>

            <Button asChild variant="outline" disabled={!waHref}>
              <a href={waHref || "#"} target="_blank" rel="noreferrer">
                Falar no WhatsApp
              </a>
            </Button>

            <Button variant="ghost" onClick={() => setPromptOpen(false)}>
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat widget (bottom sheet-ish) */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className={cn("p-0 sm:max-w-lg", className)}>
          <div className="border-b border-border p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">Atendimento</div>
              <div className="text-xs text-muted-foreground">Respostas rápidas para te ajudar a comprar.</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)} aria-label="Fechar chat">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[55vh] overflow-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border border-border/70 p-3 text-sm leading-relaxed",
                  m.role === "user" ? "bg-muted/30 ml-6" : "bg-card/60 mr-6",
                )}
              >
                {m.content}
              </div>
            ))}
            {err ? <div className="text-sm text-destructive">{err}</div> : null}
          </div>

          <div className="border-t border-border p-3 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida..."
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()}>
              {loading ? "Enviando..." : "Enviar"}
            </Button>
          </div>

          {waHref ? (
            <div className="p-3 pt-0">
              <Button asChild variant="outline" className="w-full">
                <a href={waHref} target="_blank" rel="noreferrer">
                  Preferir WhatsApp
                </a>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Small launcher button (mobile) */}
      <div className="fixed left-4 z-50 md:hidden bottom-[10.25rem]">
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-full shadow-md"
          onClick={() => setChatOpen(true)}
          aria-label="Abrir chat"
        >
          <Bot className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}
