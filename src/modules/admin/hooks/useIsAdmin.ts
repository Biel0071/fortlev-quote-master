import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const { data, error: userError } = await cloud.auth.getUser();
      const user = data.user;

      if (userError || !user) {
        const msg = userError?.message?.toLowerCase() ?? "";
        const shouldResetSession =
          Boolean(userError) && (msg.includes("jwt") || msg.includes("token") || msg.includes("claim"));

        if (shouldResetSession) {
          await cloud.auth.signOut();
        }

        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      const { data: ok, error } = await cloud.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (!cancelled) {
        setIsAdmin(!error && Boolean(ok));
        setLoading(false);
      }
    }

    run();

    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange(() => {
      run();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}
