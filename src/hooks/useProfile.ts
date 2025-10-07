import { useEffect, useState } from "react";
import type { Profile } from "@/api/profile";
import { getMyProfile, upsertMyProfile, uploadAvatar } from "@/api/profile";
import { mapDbRoleToUi } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch (e: any) {
      console.error("Erreur chargement profil:", e);
      setErr(e?.message ?? "Erreur chargement profil");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // S'abonner aux changements d'auth (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      load();
    });

    // S'abonner aux changements de profil pour rafraîchir automatiquement
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Profile updated, reloading...', payload);
          load();
        }
      )
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  async function save(patch: Partial<Profile>) {
    await upsertMyProfile(patch);
    await load(); // Recharge automatiquement après sauvegarde
  }

  async function changeAvatar(file: File) {
    const url = await uploadAvatar(file);
    await save({ avatar_url: url });
  }

  return { profile, loading, err, reload: load, save, changeAvatar };
}
