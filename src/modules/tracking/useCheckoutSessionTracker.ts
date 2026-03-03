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
  phone: string;
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  notes?: string;
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
          const { data, error } = await cloud.functions.invoke("checkout-session", {
            body: {
              session_id: sid,
              consent_given: consentOk,
              is_persistent: consentOk,
              nome: payload.name,
              telefone: payload.phone,
              email: payload.email ?? "",
              cep: payload.cep ?? "",
              endereco: payload.address ?? "",
              numero: payload.number ?? "",
              complemento: payload.complement ?? "",
              observacoes: payload.notes ?? "",
              subtotal: payload.subtotal,
              total: payload.total,
              route_type: payload.routeType,
              cart_items: payload.cartItems,
              last_step: payload.lastStep,
            },
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
