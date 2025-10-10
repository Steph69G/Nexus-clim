// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

/** ---------- Validation & normalisation ENV ---------- */
const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const rawAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

if (!rawUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL environment variable. Please add it to your .env.local file."
  );
}
if (!rawAnon) {
  throw new Error(
    "Missing VITE_SUPABASE_ANON_KEY environment variable. Please add it to your .env.local file."
  );
}
if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL format: "${rawUrl}". Must be a valid HTTP or HTTPS URL (e.g., https://your-project-id.supabase.co).`
  );
}

const SUPABASE_URL = rawUrl.replace(/\/+$/, ""); // strip trailing slash
const SUPABASE_ANON = rawAnon;

/** ---------- Helpers réseau ---------- */
const DEFAULT_TIMEOUT_MS = 12_000;
const RETRY_STATUS = new Set([502, 503, 504]); // erreurs transitoires

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch avec timeout + 1 retry sur erreurs transitoires
 * + nettoyage si refresh token invalide (400 refresh_token_not_found / Invalid Refresh Token)
 */
const customFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const attempt = async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });

      // Gestion refresh token invalide (credentialless casse parfois le flux)
      if (res.status === 400) {
        try {
          const cloned = res.clone();
          const data = await cloned.json().catch(() => null as any);
          const code = data?.code;
          const msg: string | undefined = data?.message;

          if (
            code === "refresh_token_not_found" ||
            (typeof msg === "string" && msg.toLowerCase().includes("invalid refresh token"))
          ) {
            // purge des clés Supabase locales
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith("sb-")) toRemove.push(k);
            }
            toRemove.forEach((k) => localStorage.removeItem(k));
            console.warn("[Supabase] Invalid refresh token detected → local storage cleared. Reloading…");
            // Rechargement dur pour forcer un nouveau cycle d'auth propre
            window.location.reload();
            // On retourne la réponse originale, même si la page va recharger
            return res;
          }
        } catch {
          // ignore parse error
        }
      }

      return res;
    } finally {
      clearTimeout(t);
    }
  };

  // 1er essai
  let resp: Response;
  try {
    resp = await attempt();
  } catch (e: any) {
    if (e?.name === "AbortError") {
      console.error("[Supabase fetch] Timeout after", DEFAULT_TIMEOUT_MS, "ms on", input);
      throw e;
    }
    // Erreur réseau non liée au timeout → on laisse remonter (retry ne servirait à rien)
    throw e;
  }

  // Retry simple si statut transitoire
  if (RETRY_STATUS.has(resp.status)) {
    console.warn(`[Supabase fetch] Transient ${resp.status} on ${typeof input === "string" ? input : (input as URL).toString()} → retry once…`);
    await wait(300); // petite pause
    resp = await attempt();
  }

  return resp;
};

/** ---------- Client Supabase ---------- */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // localStorage est OK en credentialless; on reste explicite
    storage: localStorage,
  },
  global: {
    fetch: customFetch,
  },
  realtime: {
    // 0 = pas de limite (selon supabase-js v2). Si tu veux limiter: ex. 10
    params: { eventsPerSecond: 0 },
  },
});

// Log debug synthétique
console.log("✅ Supabase OK:", SUPABASE_URL);
