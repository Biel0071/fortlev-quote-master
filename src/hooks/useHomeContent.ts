import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useTenant } from "@/providers/TenantProvider";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  button_label: string | null;
  link_url: string | null;
  link: string | null;
  image_path: string | null;
  image_desktop_path: string | null;
  image_mobile_path: string | null;
  sort_order: number;
  position: number;
  active: boolean;
  is_active: boolean;
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

const HOME_CONTENT_CACHE_BASE_KEY = "home_content:v1";
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

    try {
      // Parallelize with individual error handling to prevent one failure from blocking everything
      const results = await Promise.all([
        cloud.from("store_banners").select("id, title, subtitle, button_label, link_url, link, image_path, image_desktop_path, image_mobile_path, sort_order, position, active, is_active").or("is_active.eq.true,active.eq.true").eq("store_id", store.id).order("position", { ascending: true }).order("sort_order", { ascending: true }),
        cloud.from("home_benefits").select("id, title, subtitle, icon, sort_order, active").eq("active", true).eq("store_id", store.id).order("sort_order", { ascending: true }),
        cloud.from("home_policies").select("id, title, subtitle, icon, link_url, sort_order, active").eq("active", true).eq("store_id", store.id).order("sort_order", { ascending: true }),
        cloud.from("home_sections").select("id, category_id, title_override, subtitle_override, sort_order, active").eq("active", true).eq("store_id", store.id).order("sort_order", { ascending: true }),
        cloud.from("home_footer").select("id, key, logo_path, store_name, address, whatsapp, hours, extra_note, instagram_url, facebook_url, active").eq("active", true).eq("key", "main").eq("store_id", store.id).maybeSingle(),
        cloud.from("home_departments").select("id, kind, label, icon, link_url, category_id, sort_order, active").eq("active", true).eq("store_id", store.id).order("sort_order", { ascending: true }),
        cloud.from("home_offers").select("id, product_id, badge_text, promo_price, starts_at, ends_at, sort_order, active").eq("store_id", store.id).order("sort_order", { ascending: true }),
        cloud.from("home_seo").select("id, key, meta_title, meta_description, og_image_path, active").eq("active", true).eq("key", "store_home").eq("store_id", store.id).maybeSingle(),
      ]);

      const [b, ben, pol, sec, f, deps, off, s] = results;

      // Log errors but don't crash the whole process unless it's a critical failure
      results.forEach((res, i) => {
        if (res.error) console.error(`[useHomeContent] Query ${i} failed:`, res.error);
      });

      const normalizedBanners = ((b.data ?? []) as any[]).map((row) => ({
        ...row,
        link_url: row.link_url ?? row.link ?? null,
        link: row.link ?? row.link_url ?? null,
        sort_order: Number(row.sort_order ?? row.position ?? 0),
        position: Number(row.position ?? row.sort_order ?? 0),
        active: Boolean(row.active ?? row.is_active ?? true),
        is_active: Boolean(row.is_active ?? row.active ?? true),
      })) as HomeBanner[];

      const payload: HomeContentCache = {
        banners: normalizedBanners,
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
    } catch (error) {
      console.error("[useHomeContent] Error loading home content:", error);
      const message = error instanceof Error ? error.message : "Falha ao carregar conteúdo da Home";
      setError(message);
    } finally {
      setLoading(false);
    }
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
  }, [enabled, HOME_CONTENT_CACHE_KEY]);

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
