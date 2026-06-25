import { supabase } from "@/integrations/supabase/client";

// Single shared backend client for the whole app.
// Keeping one auth client prevents duplicated listeners and stale sessions when
// users move between storefront, admin and master admin routes.
export const cloud = supabase;

