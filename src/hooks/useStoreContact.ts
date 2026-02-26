import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";

export function normalizeWhatsAppPhone(input: string) {
  return input.replace(/\D/g, "");
}

export function useStoreContact() {
  const [loading, setLoading] = useState(true);
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await cloud
        .from("home_footer")
        .select("whatsapp, store_name")
        .eq("active", true)
        .eq("key", "main")
        .maybeSingle();

      if (!alive) return;
      setWhatsapp((data?.whatsapp ?? "").toString());
      setStoreName((data?.store_name ?? "").toString());
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const phoneDigits = normalizeWhatsAppPhone(whatsapp);
  const waLink = phoneDigits ? `https://wa.me/55${phoneDigits}` : "";

  return { loading, whatsappRaw: whatsapp, phoneDigits, waLink, storeName };
}
