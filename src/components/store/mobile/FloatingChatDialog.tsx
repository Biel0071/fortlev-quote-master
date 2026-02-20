import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ExternalLink, X } from "lucide-react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  analyzeChatConversation,
  closeChatSession,
  logChatMessage,
  trackVisitorEvent,
} from "@/utils/trackingClient";

type Msg = { role: "user" | "assistant"; content: string };

function defaultSystemPrompt() {
  return [
    "Você é o assistente virtual de uma loja de materiais de construção.",
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

function buildWhatsAppUrl(phoneDigits: string) {
  const base = `https://api.whatsapp.com/send?phone=55${phoneDigits}`;
  const text = "Olá vim do site e estou interessado nos produtos, gostaria de um orçamento!";
  return `${base}&text=${encodeURIComponent(text)}`;
}

export default function FloatingChatDialog({
  open,
  onOpenChange,
  phoneDigits,
  chatSessionId,
  scoreSnapshot,
  trackerSessionToken,
  consentOk,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phoneDigits?: string;
  chatSessionId: string | null;
  scoreSnapshot: number;
  trackerSessionToken: string;
  consentOk: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        scoreSnapshot > 90
          ? "Vi que você já está bem perto de fechar. Quer que eu monte um orçamento rápido com os itens certos?"
          : scoreSnapshot > 60
            ? "Vi que você está analisando alguns produtos. Posso te ajudar a calcular o melhor custo-benefício?"
            : "Olá 👋 Sou o assistente da loja. Posso ajudar com orçamento, produtos ou entrega.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, err]);

  const canWhatsApp = useMemo(() => Boolean(phoneDigits && phoneDigits.length >= 8), [phoneDigits]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setErr("");
    setInput("");

    const history = messages.slice();
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    if (consentOk) {
      trackVisitorEvent({ sessionToken: trackerSessionToken, consentGiven: true, event: { type: "chat_message_sent" } }).catch(
        () => {},
      );
    }
    if (chatSessionId) {
      logChatMessage({ chatSessionId, role: "user", content: text }).catch(() => {});
    }

    setLoading(true);
    try {
      const answer = await askAI(history, text);
      setMessages((prev) => [...prev, { role: "assistant", content: answer || "" }]);
      if (chatSessionId && answer) {
        logChatMessage({ chatSessionId, role: "assistant", content: answer }).catch(() => {});
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 sm:max-w-xl", "bg-background/80 supports-[backdrop-filter]:bg-background/70 backdrop-blur-xl")}>
        <div className="border-b border-border p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div className="font-semibold leading-none">Assistente da loja</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Respostas rápidas para te ajudar a comprar.</div>

            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={!canWhatsApp}
                onClick={() => {
                  if (consentOk) {
                    trackVisitorEvent({ sessionToken: trackerSessionToken, consentGiven: true, event: { type: "whatsapp_click" } }).catch(
                      () => {},
                    );
                  }
                  if (!canWhatsApp) return;
                  const url = buildWhatsAppUrl(phoneDigits!);
                  window.open(url, "_blank", "noreferrer");
                  if (consentOk) {
                    trackVisitorEvent({ sessionToken: trackerSessionToken, consentGiven: true, event: { type: "request_quote" } }).catch(
                      () => {},
                    );
                  }
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Falar direto no WhatsApp
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={async () => {
              onOpenChange(false);
              if (chatSessionId) {
                closeChatSession({ chatSessionId }).catch(() => {});
                analyzeChatConversation({ chatSessionId }).catch(() => {});
              }
            }}
            aria-label="Fechar chat"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-2xl border border-border/70 p-3 text-sm leading-relaxed",
                m.role === "user" ? "bg-muted/30 ml-8" : "bg-card/60 mr-8",
              )}
            >
              {m.content}
            </div>
          ))}
          {loading ? <div className="text-sm text-muted-foreground">Digitando…</div> : null}
          {err ? <div className="text-sm text-destructive">{err}</div> : null}
          <div ref={endRef} />
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
            className="h-12 rounded-xl"
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="h-12 rounded-xl px-5">
            Enviar
          </Button>
        </div>

        <div className="hidden" data-session-token={trackerSessionToken} data-chat-session-id={chatSessionId ?? ""} />
      </DialogContent>
    </Dialog>
  );
}
