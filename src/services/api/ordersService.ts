import { cloud } from "@/lib/cloud";

export async function getOrders() {
  const { data, error } = await cloud.from("store_orders").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createOrder(payload: Record<string, unknown>) {
  const { data, error } = await cloud.from("store_orders").insert(payload as any).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
