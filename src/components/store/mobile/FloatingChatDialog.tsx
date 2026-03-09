import React, { useEffect, useMemo, useRef, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { analyzeChatConversation, closeChatSession, logChatMessage } from "@/utils/trackingClient";
import { collectAndTrackEvent } from "@/modules/tracking";

type Msg = { role: "user" | "assistant"; content: string };

type AIInvokeError = {
  message?: string;
  context?: { status?: number };
};

function defaultSystemPrompt() {
  return [
    "Você é a Vanessa, consultora técnica de um depósito de materiais de construção.",
    "Responda de forma curta, natural, profissional e orientada a conversão.",
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

  if (error) throw error as unknown as AIInvokeError;

  const answer = String((data as any)?.answer ?? "").trim();
  if (!answer) throw { message: "empty_answer" } satisfies AIInvokeError;

  return answer;
}

function buildWhatsAppUrl(phoneDigits: string) {
  const base = `https://api.whatsapp.com/send?phone=55${phoneDigits}`;
  const text = "Olá vim do site e estou interessado nos produtos, gostaria de um orçamento!";
  return `${base}&text=${encodeURIComponent(text)}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19.11 17.47c-.27-.14-1.56-.77-1.8-.86-.24-.09-.41-.14-.59.14-.18.27-.68.86-.84 1.04-.15.18-.31.2-.58.07-.27-.14-1.12-.41-2.14-1.31-.79-.7-1.32-1.56-1.47-1.83-.15-.27-.02-.41.11-.54.12-.12.27-.31.41-.46.14-.15.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.59-1.42-.81-1.94-.21-.52-.43-.45-.59-.45l-.5-.01c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.63 1.12 2.82.14.18 1.93 2.95 4.67 4.14.65.28 1.16.45 1.56.57.65.21 1.25.18 1.72.11.52-.08 1.56-.64 1.78-1.26.22-.61.22-1.14.16-1.26-.07-.12-.25-.2-.52-.34z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16 3.2C8.93 3.2 3.2 8.93 3.2 16c0 2.25.59 4.36 1.62 6.2L3.2 28.8l6.77-1.56A12.73 12.73 0 0 0 16 28.8c7.07 0 12.8-5.73 12.8-12.8S23.07 3.2 16 3.2zm0 22.27c-2.04 0-3.94-.6-5.54-1.63l-.4-.25-3.95.9.94-3.86-.27-.4a9.9 9.9 0 0 1-1.6-5.42c0-5.46 4.43-9.9 9.88-9.9 5.46 0 9.9 4.44 9.9 9.9 0 5.45-4.44 9.88-9.9 9.88z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type FloatingChatDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phoneDigits?: string;
  chatSessionId: string | null;
  scoreSnapshot: number;
  trackerSessionToken: string;
  consentOk: boolean;
};

const FloatingChatDialog = React.forwardRef<HTMLDivElement, FloatingChatDialogProps>(
  ({ open, onOpenChange, phoneDigits, chatSessionId, scoreSnapshot, trackerSessionToken, consentOk }, ref) => {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [introTyping, setIntroTyping] = useState(false);

    const endRef = useRef<HTMLDivElement | null>(null);
    const introTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages.length, loading, introTyping]);

    const canWhatsApp = useMemo(() => Boolean(phoneDigits && phoneDigits.length >= 8), [phoneDigits]);

    useEffect(() => {
      if (!open) return;
      if (messages.length > 0) return;

      setIntroTyping(true);
      introTimeoutRef.current = window.setTimeout(() => {
        setMessages([
          {
            role: "assistant",
            content:
              "Olá 👋 Sou a Vanessa, consultora técnica do depósito. Posso te ajudar com orçamento, entrega ou escolha de materiais.",
          },
        ]);
        setIntroTyping(false);
        introTimeoutRef.current = null;
      }, 800);

      return () => {
        if (introTimeoutRef.current) window.clearTimeout(introTimeoutRef.current);
        introTimeoutRef.current = null;
      };
    }, [open, messages.length, scoreSnapshot]);

    const send = async () => {
      const text = input.trim();
      if (!text || loading) return;

      setInput("");

      const history = messages.slice();
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      if (consentOk) {
        collectAndTrackEvent({
          sessionToken: trackerSessionToken,
          consentGiven: true,
          event: { type: "chat_message_sent", path: window.location.pathname },
        }).catch(() => {});
      }
      if (chatSessionId) {
        logChatMessage({ chatSessionId, role: "user", content: text }).catch(() => {});
      }

      setLoading(true);
      try {
        const answer = await askAI(history, text);
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
        if (chatSessionId && answer) {
          logChatMessage({ chatSessionId, role: "assistant", content: answer }).catch(() => {});
        }
      } catch (e) {
        const status = (e as any)?.context?.status as number | undefined;

        if (status === 402 || status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "No momento estou finalizando alguns atendimentos. Você pode falar direto comigo no WhatsApp que te respondo rapidinho.",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Tive uma instabilidade aqui — tenta novamente em instantes." },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <div ref={ref}>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            onOpenChange(v);
            if (!v && chatSessionId) {
              closeChatSession({ chatSessionId }).catch(() => {});
              analyzeChatConversation({ chatSessionId }).catch(() => {});
            }
          }}
        >
          <DialogContent
            className={cn(
              "p-0 sm:max-w-xl",
              "bg-card/95 supports-[backdrop-filter]:bg-card/90 backdrop-blur-xl",
              "shadow-lg border-border/40",
            )}
          >
            <DialogTitle className="sr-only">Atendimento — Vanessa</DialogTitle>
            <DialogDescription className="sr-only">Chat de atendimento com a consultora técnica.</DialogDescription>

            <div className="border-b border-border/30 bg-muted/20 p-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "h-11 w-11 rounded-full",
                    "bg-primary/10",
                    "border border-primary/20",
                    "grid place-items-center",
                    "shrink-0",
                  )}
                  aria-hidden="true"
                >
                  <span className="font-semibold text-primary/80">V</span>
                </div>

                <div className="min-w-0">
                  <div className="font-semibold leading-none truncate">Vanessa</div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">Consultora Técnica • Online agora</div>
                </div>
              </div>
            </div>

            <div className="p-4 pt-3">
              <Button
                variant="whatsapp"
                className={cn(
                  "w-full h-14 rounded-2xl font-semibold",
                  "gap-3",
                  "shadow-md hover:shadow-lg",
                  "transition-all duration-200 ease-out",
                  "hover:scale-[1.02]",
                )}
                disabled={!canWhatsApp}
                onClick={() => {
                  if (consentOk) {
                    collectAndTrackEvent({
                      sessionToken: trackerSessionToken,
                      consentGiven: true,
                      event: { type: "whatsapp_click", path: window.location.pathname },
                    }).catch(() => {});
                  }
                  if (!canWhatsApp) return;
                  const url = buildWhatsAppUrl(phoneDigits!);
                  window.open(url, "_blank", "noreferrer");
                  if (consentOk) {
                    collectAndTrackEvent({
                      sessionToken: trackerSessionToken,
                      consentGiven: true,
                      event: { type: "request_quote", path: window.location.pathname },
                    }).catch(() => {});
                  }
                }}
              >
                <WhatsAppIcon className="h-6 w-6" />
                Falar no WhatsApp
              </Button>
            </div>

            <div className="max-h-[56vh] overflow-auto px-4 pb-4 space-y-3">
              {introTyping ? <div className="text-sm text-muted-foreground">Vanessa está digitando…</div> : null}

              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-2xl border border-border/70 p-3 text-sm leading-relaxed",
                    m.role === "user" ? "bg-muted/30 ml-10" : "bg-card/60 mr-10",
                  )}
                >
                  {m.content}
                </div>
              ))}

              {loading ? <div className="text-sm text-muted-foreground">Digitando…</div> : null}
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
              <Button variant="secondary" onClick={send} disabled={loading || !input.trim()} className="h-12 rounded-xl px-4">
                Enviar
              </Button>
            </div>

            <div className="hidden" data-session-token={trackerSessionToken} data-chat-session-id={chatSessionId ?? ""} />
          </DialogContent>
        </Dialog>
      </div>
    );
  },
);
FloatingChatDialog.displayName = "FloatingChatDialog";

export default FloatingChatDialog;
