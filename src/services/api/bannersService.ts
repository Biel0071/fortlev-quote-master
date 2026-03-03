import { cloud } from "@/lib/cloud";

export async function getBanners() {
  const { data, error } = await cloud.from("store_banners").select("*").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createBanner(payload: Record<string, unknown>) {
  const { data, error } = await cloud.from("store_banners").insert(payload as any).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
