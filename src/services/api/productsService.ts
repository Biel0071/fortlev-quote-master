import { cloud } from "@/lib/cloud";

export async function getProducts() {
  const { data, error } = await cloud.from("store_products").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createProduct(payload: Record<string, unknown>) {
  const { data, error } = await cloud.from("store_products").insert(payload as any).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
