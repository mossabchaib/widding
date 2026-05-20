import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "client" | "provider" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  wilaya: string;
  is_active: boolean;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const lastUidRef = useRef<string | null>(null);
  const extrasLoadedForRef = useRef<string | null>(null);
  const fetchingForRef = useRef<string | null>(null);

  // ✅ بدون getSession داخلها — هذا كان يسبب 429
  const fetchExtras = useCallback(async (uid: string) => {
    if (fetchingForRef.current === uid) return;
    fetchingForRef.current = uid;

    try {
      const [{ data: prof }, { data: rs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      setProfile((prof as Profile) ?? null);
      setRoles((rs ?? []).map((r: any) => r.role as AppRole));
      extrasLoadedForRef.current = uid;
    } catch (err) {
      console.error("fetchExtras error:", err);
    } finally {
      fetchingForRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const handleSession = (event: string, s: Session | null) => {
      if (!mounted) return;

      if (event === "TOKEN_REFRESHED") {
        setSession(s);
        return;
      }

      setSession(s);
      setUser(s?.user ?? null);
      const uid = s?.user?.id ?? null;

      if (uid !== lastUidRef.current) {
        lastUidRef.current = uid;

        if (uid) {
          setTimeout(() => {
            if (!mounted) return;
            fetchExtras(uid).finally(() => {
              if (mounted) setLoading(false);
            });
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          extrasLoadedForRef.current = null;
          fetchingForRef.current = null;
          setLoading(false);
        }
      } else if (uid && extrasLoadedForRef.current === uid) {
        setLoading(false);
      } else if (!uid) {
        setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      handleSession(event, s);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (lastUidRef.current === null) {
        handleSession("INITIAL_SESSION", data.session);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchExtras]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) {
      extrasLoadedForRef.current = null;
      await fetchExtras(user.id);
    }
  };

  return {
    session,
    user,
    profile,
    roles,
    loading,
    isAuthenticated: !!user,
    isAdmin: roles.includes("admin"),
    isProvider: roles.includes("provider"),
    isClient: roles.includes("client"),
    signOut,
    refresh,
  };
}