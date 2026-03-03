import { cloud } from "@/lib/cloud";

export async function getCustomers() {
  const { data, error } = await cloud.from("store_customers").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createCustomer(payload: Record<string, unknown>) {
  const { data, error } = await cloud.from("store_customers").insert(payload as any).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
