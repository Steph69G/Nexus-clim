// src/hooks/useProfile.ts
import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/api/profile";
import { getMyProfile, upsertMyProfile, uploadAvatar } from "@/api/profile";
import { supabase } from "@/lib/supabase";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // anti-doublons / anti-boucle
  const lastUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false); // empêche les loads concurrents

  async function load() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setErr(null);
    try {
      const p = await getMyProfile(); // lit le profil du user courant (via la session supabase)
      if (mountedRef.current) setProfile(p);
    } catch (e: any) {
      if (mountedRef.current) {
        console.warn("useProfile → getMyProfile:", e?.message ?? e);
        setErr(e?.message ?? "Erreur chargement profil");
      }
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    // Abonnement unique : reçoit l'état initial via `INITIAL_SESSION`
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const uid = session?.user?.id ?? null;

        // Déconnexion → on vide proprement
        if (!uid) {
          lastUserIdRef.current = null;
          setProfile(null);
          setLoading(false);
          return;
        }

        // Si même user ET événement non-pertinent → on ignore
        // (évite double `INITIAL_SESSION`/`SIGNED_IN` en dev + StrictMode)
        if (uid === lastUserIdRef.current && event !== "TOKEN_REFRESHED" && event !== "USER_UPDATED") {
          return;
        }

        lastUserIdRef.current = uid;
        // Charger/actualiser le profil pour ce user
        load();
      }
    );

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function save(patch: Partial<Profile>) {
    await upsertMyProfile(patch);
    // reload silencieux
    await load();
  }

  async function changeAvatar(file: File) {
    const url = await uploadAvatar(file);
    await save({ avatar_url: url });
  }

  return { profile, loading, err, reload: load, save, changeAvatar };
}
