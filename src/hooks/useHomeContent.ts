import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  button_label: string | null;
  link_url: string | null;
  image_path: string | null;
  image_desktop_path: string | null;
  image_mobile_path: string | null;
  sort_order: number;
  active: boolean;
};

export type HomeBenefit = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
};

export type HomePolicy = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  link_url: string | null;
  sort_order: number;
  active: boolean;
};

export type HomeSection = {
  id: string;
  category_id: string;
  title_override: string | null;
  subtitle_override: string | null;
  sort_order: number;
  active: boolean;
};

export type HomeFooter = {
  id: string;
  key: string;
  logo_path: string | null;
  store_name: string | null;
  address: string | null;
  whatsapp: string | null;
  hours: string | null;
  extra_note: string | null;
  active: boolean;
};

export function useHomeContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [benefits, setBenefits] = useState<HomeBenefit[]>([]);
  const [policies, setPolicies] = useState<HomePolicy[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [footer, setFooter] = useState<HomeFooter | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const [b, ben, pol, sec, f] = await Promise.all([
      cloud
        .from("store_banners")
        .select(
          "id, title, subtitle, button_label, link_url, image_path, image_desktop_path, image_mobile_path, sort_order, active",
        )
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_benefits")
        .select("id, title, subtitle, icon, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_policies")
        .select("id, title, subtitle, icon, link_url, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_sections")
        .select("id, category_id, title_override, subtitle_override, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_footer")
        .select("id, key, logo_path, store_name, address, whatsapp, hours, extra_note, active")
        .eq("active", true)
        .eq("key", "main")
        .maybeSingle(),
    ]);

    const firstError = b.error || ben.error || pol.error || sec.error || f.error;
    if (firstError) {
      setError(firstError.message);
      setBanners([]);
      setBenefits([]);
      setPolicies([]);
      setSections([]);
      setFooter(null);
      setLoading(false);
      return;
    }

    setBanners((b.data ?? []) as any);
    setBenefits((ben.data ?? []) as any);
    setPolicies((pol.data ?? []) as any);
    setSections((sec.data ?? []) as any);
    setFooter((f.data as any) ?? null);
    setLoading(false);
    return;
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasHero = useMemo(() => banners.length > 0, [banners]);

  return { banners, benefits, policies, sections, footer, hasHero, loading, error, reload: load };
}
