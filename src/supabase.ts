// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Message clair pour la console si les variables manquent dans Bolt
  console.error("Supabase env manquantes:", { url, anonKeyPresent: !!anonKey });
  throw new Error(
    "VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY est absent. Ajoute-les dans Bolt puis relance la preview."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Petit log utile en debug
console.log("✅ Supabase OK:", url);
