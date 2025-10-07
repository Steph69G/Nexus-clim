// src/routes/RequireAuth.tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function RequireAuth({ element }: { element: JSX.Element }) {
  const { loading, session } = useAuth();
  const loc = useLocation();
  const [retrying, setRetrying] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (session) { setHasSession(true); return; }
    // Pas de session en contexte -> on re-check une fois côté SDK
    setRetrying(true);
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    }).finally(() => setRetrying(false));
  }, [loading, session]);

  if (loading || retrying || hasSession === null) return <div className="p-6">Chargement…</div>;
  if (!(session || hasSession)) return <Navigate to="/login" state={{ from: loc }} replace />;
  return element;
}
