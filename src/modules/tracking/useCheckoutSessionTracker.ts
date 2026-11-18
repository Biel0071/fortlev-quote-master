import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { consentGiven, getConsentState } from "@/utils/consent";
import { cloud } from "@/lib/cloud";
import { runApiMicrotask, smartCache } from "@/utils/smartCache";

const PERSISTENT_SESSION_KEY = "checkout_session_id_v1";

function createSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getOrCreatePersistentSessionId(fallback?: string) {
  const existing = localStorage.getItem(PERSISTENT_SESSION_KEY);
  if (existing) return existing;
  const id = fallback ?? createSessionId();
  localStorage.setItem(PERSISTENT_SESSION_KEY, id);
  return id;
}

export type CheckoutSessionPayload = {
  name: string;
  cpf?: string;
  phone: string;
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  notes?: string;
  paymentMethod?: string;
  subtotal: number;
  total: number;
  routeType: "whatsapp" | "gateway";
  cartItems: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_subtotal: number;
  }>;
  lastStep: "identify" | "delivery" | "redirected" | "completed";
};

export function useCheckoutSessionTracker() {
  const [consentState, setConsentState] = useState(() => getConsentState());
  const memorySessionRef = useRef<string>(createSessionId());

  const consentOk = useMemo(() => consentGiven(consentState), [consentState]);
  const [sessionId, setSessionId] = useState<string>(() =>
    consentGiven(getConsentState())
      ? getOrCreatePersistentSessionId(memorySessionRef.current)
      : memorySessionRef.current,
  );

  useEffect(() => {
    const onStorage = () => setConsentState(getConsentState());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const nextSessionId = consentOk
      ? getOrCreatePersistentSessionId(memorySessionRef.current)
      : memorySessionRef.current;
    setSessionId(nextSessionId);
  }, [consentOk]);

  const pushSession = useCallback(
    async (payload: CheckoutSessionPayload) => {
      const sid = sessionId || memorySessionRef.current;
      const key = [
        "checkout-session",
        sid,
        payload.lastStep,
        payload.routeType,
        payload.phone.replace(/\D/g, ""),
        Math.round(payload.total * 100),
      ].join(":");

      return smartCache.fetch(
        key,
        async () => {
          const { data, error } = await cloud.rpc("rpc_save_checkout_collection", {
            p_session_id: sid,
            p_nome: payload.name ?? "",
            p_cpf: payload.cpf ?? "",
            p_telefone: payload.phone ?? "",
            p_email: payload.email ?? "",
            p_cep: payload.cep ?? "",
            p_endereco: payload.address ?? "",
            p_numero: payload.number ?? "",
            p_complemento: payload.complement ?? "",
            p_observacoes: payload.notes ?? "",
            p_payment_method: payload.paymentMethod ?? "",
            p_subtotal: payload.subtotal ?? 0,
            p_total: payload.total ?? 0,
            p_route_type: payload.routeType,
            p_cart_items: payload.cartItems ?? [],
            p_consent_given: consentOk,
            p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "web",
          });

          if (error) throw error;
          return data;
        },
        1800,
      );
    },
    [consentOk, sessionId],
  );

  const pushSessionInBackground = useCallback(
    (payload: CheckoutSessionPayload) => {
      runApiMicrotask(async () => {
        try {
          await pushSession(payload);
        } catch {
          // tracking best-effort
        }
      });
    },
    [pushSession],
  );

  return {
    sessionId,
    consentOk,
    isPersistent: consentOk,
    pushSession,
    pushSessionInBackground,
  };
}
