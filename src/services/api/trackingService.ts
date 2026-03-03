import { cloud } from "@/lib/cloud";

export async function getTrackingSessions() {
  const { data, error } = await cloud.from("user_sessions").select("*").order("last_seen_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return data;
}

export async function getTrackingEvents(sessionId: string) {
  const { data, error } = await cloud.from("user_events").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return data;
}
