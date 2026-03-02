import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";

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
  instagram_url?: string | null;
  facebook_url?: string | null;
  active: boolean;
};

export type HomeDepartment = {
  id: string;
  kind: string;
  label: string;
  icon: string | null;
  link_url: string | null;
  category_id: string | null;
  sort_order: number;
  active: boolean;
};

export type HomeOffer = {
  id: string;
  product_id: string;
  badge_text: string | null;
  promo_price: number | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  active: boolean;
};

export type HomeSeo = {
  id: string;
  key: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_path: string | null;
  active: boolean;
};

type HomeContentCache = {
  banners: HomeBanner[];
  benefits: HomeBenefit[];
  policies: HomePolicy[];
  sections: HomeSection[];
  footer: HomeFooter | null;
  departments: HomeDepartment[];
  offers: HomeOffer[];
  seo: HomeSeo | null;
};

const HOME_CONTENT_CACHE_KEY = "home_content:v1";
const HOME_CONTENT_CACHE_TTL_MS = 1000 * 60 * 3;

type UseHomeContentOptions = {
  enabled?: boolean;
};

export function useHomeContent(options?: UseHomeContentOptions) {
  const enabled = options?.enabled ?? true;
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [benefits, setBenefits] = useState<HomeBenefit[]>([]);
  const [policies, setPolicies] = useState<HomePolicy[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [footer, setFooter] = useState<HomeFooter | null>(null);

  const [departments, setDepartments] = useState<HomeDepartment[]>([]);
  const [offers, setOffers] = useState<HomeOffer[]>([]);
  const [seo, setSeo] = useState<HomeSeo | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    if (!enabled) return;
    if (!opts?.silent) setLoading(true);
    setError(null);

    const [b, ben, pol, sec, f, deps, off, s] = await Promise.all([
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
        .select("id, key, logo_path, store_name, address, whatsapp, hours, extra_note, instagram_url, facebook_url, active")
        .eq("active", true)
        .eq("key", "main")
        .maybeSingle(),
      cloud
        .from("home_departments")
        .select("id, kind, label, icon, link_url, category_id, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_offers")
        .select("id, product_id, badge_text, promo_price, starts_at, ends_at, sort_order, active")
        .order("sort_order", { ascending: true }),
      cloud
        .from("home_seo")
        .select("id, key, meta_title, meta_description, og_image_path, active")
        .eq("active", true)
        .eq("key", "store_home")
        .maybeSingle(),
    ]);

    const firstError = b.error || ben.error || pol.error || sec.error || f.error || deps.error || off.error || s.error;
    if (firstError) {
      setError(firstError.message);
      setBanners([]);
      setBenefits([]);
      setPolicies([]);
      setSections([]);
      setFooter(null);
      setDepartments([]);
      setOffers([]);
      setSeo(null);
      setLoading(false);
      return;
    }

    const payload: HomeContentCache = {
      banners: (b.data ?? []) as any,
      benefits: (ben.data ?? []) as any,
      policies: (pol.data ?? []) as any,
      sections: (sec.data ?? []) as any,
      footer: (f.data as any) ?? null,
      departments: (deps.data ?? []) as any,
      offers: (off.data ?? []) as any,
      seo: (s.data as any) ?? null,
    };

    setBanners(payload.banners);
    setBenefits(payload.benefits);
    setPolicies(payload.policies);
    setSections(payload.sections);
    setFooter(payload.footer);
    setDepartments(payload.departments);
    setOffers(payload.offers);
    setSeo(payload.seo);
    setSmartCache(HOME_CONTENT_CACHE_KEY, payload);

    setLoading(false);
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cached = getSmartCache<HomeContentCache>(HOME_CONTENT_CACHE_KEY, HOME_CONTENT_CACHE_TTL_MS);
    if (cached) {
      setBanners(cached.banners ?? []);
      setBenefits(cached.benefits ?? []);
      setPolicies(cached.policies ?? []);
      setSections(cached.sections ?? []);
      setFooter(cached.footer ?? null);
      setDepartments(cached.departments ?? []);
      setOffers(cached.offers ?? []);
      setSeo(cached.seo ?? null);
      setLoading(false);
      runApiMicrotask(() => load({ silent: true }));
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const hasHero = useMemo(() => banners.length > 0, [banners]);

  return {
    banners,
    benefits,
    policies,
    sections,
    footer,
    departments,
    offers,
    seo,
    hasHero,
    loading,
    error,
    reload: load,
  };
}
