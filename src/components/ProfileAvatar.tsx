// src/components/ProfileAvatar.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";

type Props = { size?: number };

export default function ProfileAvatar({ size = 40 }: Props) {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setUrl(null);
      return;
    }

    (async () => {
      try {
        // On lit un champ `avatar_path` dans profiles, sinon fallback
        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_path, full_name")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        const path: string | null = data?.avatar_path ?? null;

        if (path) {
          // Signed URL (évite CORS/cookies dans l’environnement credentialless)
          const { data: signed, error: sErr } = await supabase
            .storage
            .from("avatars")
            .createSignedUrl(path, 60 * 30); // 30 min
          if (sErr) throw sErr;
          if (mounted) setUrl(signed?.signedUrl ?? null);
        } else {
          if (mounted) setUrl(null);
        }
      } catch (e: any) {
        console.error("[ProfileAvatar] error:", e?.message || e);
        if (mounted) {
          setUrl(null);
          setErr("noavatar");
        }
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  // Fallback simple (initiales)
  if (!url) {
    const letter = (user?.email?.[0] || "U").toUpperCase();
    return (
      <div
        title={err ? "Aucun avatar — fallback" : "Avatar"}
        style={{
          width: size, height: size, borderRadius: "50%",
          display: "grid", placeItems: "center",
          fontWeight: 700, background: "#E5E7EB", color: "#111827",
        }}>
        {letter}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Avatar"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
      onError={() => setUrl(null)}
    />
  );
}
