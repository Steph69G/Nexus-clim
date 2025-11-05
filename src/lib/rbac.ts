import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "manager" | "tech" | "st" | "client" | "sal";

export const VisibilityMatrix = {
  "feature:planning.multitech": ["admin", "manager", "sal"],
  "feature:planning.journalier": ["admin", "manager", "tech", "sal"],
  "feature:calendar.global": ["admin", "manager", "tech", "st", "sal"],
  "feature:map.interventions": ["admin", "manager", "tech", "st", "sal"],
  "feature:mission.list": ["admin", "manager", "tech", "sal"],
  "feature:mission.create": ["admin", "manager", "sal"],
  "feature:offers.published": ["admin", "manager", "st", "sal"],
  "feature:urgent.repairs": ["admin", "manager", "tech", "st", "sal"],
} as const;

export type Permission = keyof typeof VisibilityMatrix;

export function can(role: AppRole | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  return VisibilityMatrix[perm].includes(role as any);
}

export function useCurrentRole(defaultRole: AppRole = "admin"): AppRole {
  const [role, setRole] = useState<AppRole>(defaultRole);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.user.id)
          .maybeSingle();

        if (!cancelled && !error && data?.role) {
          setRole((data.role as AppRole) ?? defaultRole);
        }
      } catch {
        // fallback silencieux
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultRole]);

  return role;
}

export function getCurrentRole(): AppRole | null {
  return null;
}
