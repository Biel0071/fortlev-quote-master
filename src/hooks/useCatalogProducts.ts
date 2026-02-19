import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import type { Product } from "@/types/quotation";
import type { ConstructionProduct, ConstructionCategory } from "@/types/construction";
import { products as legacyFortlevProducts } from "@/data/products";
import { constructionProducts as legacyConstructionProducts } from "@/data/constructionProducts";
import { getCustomConstructionProducts, getCustomFortlevProducts } from "@/utils/customCatalog";

export function useFortlevCatalogProducts() {
  const [dbProducts, setDbProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await cloud
        .from("fortlev_catalog_products")
        .select("id, legacy_id, name, capacity, unit, height, diameter, base_price, type")
        .eq("active", true)
        .order("capacity", { ascending: true });

      if (cancelled) return;

      if (error || !data) {
        setDbProducts([]);
        return;
      }

      const mapped: Product[] = data.map((r: any) => ({
        id: r.legacy_id ?? r.id,
        name: r.name,
        capacity: Number(r.capacity ?? 0),
        unit: (r.unit ?? "L") as Product["unit"],
        height: r.height ?? "",
        diameter: r.diameter ?? "",
        basePrice: Number(r.base_price ?? 0),
        type: (r.type ?? "caixa") as Product["type"],
      }));

      setDbProducts(mapped);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const custom = useMemo(() => {
    try {
      return getCustomFortlevProducts();
    } catch {
      return [];
    }
  }, []);

  return useMemo(() => {
    // Prefer DB products when available; otherwise fallback to legacy.
    const base = (dbProducts && dbProducts.length > 0 ? dbProducts : legacyFortlevProducts) ?? [];
    const byId = new Map<string, Product>();
    [...custom, ...base].forEach((p) => byId.set(p.id, p));
    return Array.from(byId.values());
  }, [custom, dbProducts]);
}

export function useConstructionCatalogProducts() {
  const [dbProducts, setDbProducts] = useState<ConstructionProduct[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await cloud
        .from("construction_catalog_products")
        .select("id, legacy_id, name, unit, base_price, category")
        .eq("active", true)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error || !data) {
        setDbProducts([]);
        return;
      }

      const mapped: ConstructionProduct[] = data.map((r: any) => ({
        id: r.legacy_id ?? r.id,
        name: r.name,
        unit: r.unit,
        basePrice: Number(r.base_price ?? 0),
        category: (r.category ?? "outros") as ConstructionCategory,
      }));

      setDbProducts(mapped);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const custom = useMemo(() => {
    try {
      return getCustomConstructionProducts();
    } catch {
      return [];
    }
  }, []);

  return useMemo(() => {
    const base = (dbProducts && dbProducts.length > 0 ? dbProducts : legacyConstructionProducts) ?? [];
    const byId = new Map<string, ConstructionProduct>();
    [...custom, ...base].forEach((p) => byId.set(p.id, p));
    return Array.from(byId.values());
  }, [custom, dbProducts]);
}
