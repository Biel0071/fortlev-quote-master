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
      try {

      const { data, error } = await cloud
        .from("fortlev_catalog_products")
        .select("*")
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
      } catch (err) {
        console.error("Error loading Fortlev products:", err);
        if (!cancelled) setDbProducts([]);
      }
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
    // Use legacy products as base, and override with DB products if they exist
    const base = legacyFortlevProducts ?? [];
    const dbMap = new Map<string, Product>();
    if (dbProducts && dbProducts.length > 0) {
      dbProducts.forEach(p => dbMap.set(p.id, p));
    }

    const byId = new Map<string, Product>();
    // Add legacy first
    base.forEach(p => byId.set(p.id, p));
    // Add/Override with DB
    if (dbProducts) {
      dbProducts.forEach(p => byId.set(p.id, p));
    }
    // Add custom
    custom.forEach((p) => byId.set(p.id, p));
    
    return Array.from(byId.values());

  }, [custom, dbProducts]);
}

function mapToConstructionCategory(cat: string): ConstructionCategory {
  const c = cat?.toLowerCase() || "";
  if (c.includes('piso') || c.includes('revestimento')) return 'pisos-revestimentos';
  if (c.includes('tinta') || c.includes('pintura')) return 'pintura';
  if (c.includes('metal') || c.includes('louça')) return 'metais-loucas';
  if (c.includes('ferragem')) return 'ferragens';
  if (c.includes('ferramenta')) return 'ferramentas';
  if (c.includes('hidráulica')) return 'hidraulica';
  if (c.includes('elétrica')) return 'eletrica';
  if (c.includes('cimento') || c.includes('argamassa')) return 'cimentos';
  if (c.includes('tijolo') || c.includes('bloco')) return 'blocos-tijolos';
  if (c.includes('telha') || c.includes('cobertura')) return 'telhas';
  if (c.includes('madeira')) return 'madeiras';
  if (c.includes('churrasqueira')) return 'churrasqueiras';
  if (c.includes('agregado')) return 'agregados';
  if (c.includes('estrutura')) return 'estruturas';
  if (c.includes('acabamento')) return 'acabamentos';
  return 'outros';
}

export function useConstructionCatalogProducts() {
  const [dbProducts, setDbProducts] = useState<ConstructionProduct[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {

      // Fetch from construction_catalog_products
      const { data: constructionData } = await cloud
        .from("construction_catalog_products")
        .select("id, legacy_id, name, unit, base_price, category")
        .eq("active", true)
        .order("name", { ascending: true });

      // Fetch from store_products (general materials)
      const { data: storeData } = await cloud
        .from("store_products")
        .select("id, name, unit, price, category")
        .eq("status", "published")
        .order("name", { ascending: true });

      if (cancelled) return;

      const products1: ConstructionProduct[] = (constructionData || []).map((r: any) => ({
        id: r.legacy_id ?? r.id,
        name: r.name,
        unit: r.unit || 'un',
        basePrice: Number(r.base_price ?? 0),
        category: (r.category ?? "outros") as ConstructionCategory,
      }));

      const products2: ConstructionProduct[] = (storeData || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        unit: r.unit || 'un',
        basePrice: Number(r.price || 0),
        category: mapToConstructionCategory(r.category),
      }));

      // Merge and remove duplicates by ID
      const mergedMap = new Map<string, ConstructionProduct>();
      [...products1, ...products2].forEach(p => mergedMap.set(p.id, p));
      
      setDbProducts(Array.from(mergedMap.values()));
      } catch (err) {
        console.error("Error loading construction products:", err);
        if (!cancelled) setDbProducts([]);
      }
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
    const base = legacyConstructionProducts ?? [];
    const byId = new Map<string, ConstructionProduct>();
    // Add legacy first
    base.forEach(p => byId.set(p.id, p));
    // Add/Override with DB
    if (dbProducts) {
      dbProducts.forEach(p => byId.set(p.id, p));
    }
    // Add custom
    custom.forEach((p) => byId.set(p.id, p));
    
    return Array.from(byId.values());

  }, [custom, dbProducts]);
}
