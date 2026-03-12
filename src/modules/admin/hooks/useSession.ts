import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { cloud } from "@/lib/cloud";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const validateAndSetSession = async (nextSession: Session | null) => {
      if (!nextSession) {
        if (!cancelled) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await cloud.auth.getUser();
      if (error || !data.user) {
        await cloud.auth.signOut();
        if (!cancelled) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setSession(nextSession);
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange((_event, nextSession) => {
      void validateAndSetSession(nextSession);
    });

    cloud.auth
      .getSession()
      .then(({ data }) => validateAndSetSession(data.session))
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const user: User | null = useMemo(() => session?.user ?? null, [session]);

  return { session, user, loading };
}

