const e = import.meta.env;

function requireVar(name: string): string {
  const v = e[name];
  if (!v || String(v).trim() === "") {
    throw new Error(`[ENV] Variable manquante: ${name}.
    Ajoute-la dans .env.local (local) ou dans Bolt > Environment (preview).`);
  }
  return v as string;
}

export const ENV = {
  SUPABASE_URL: requireVar("VITE_SUPABASE_URL"),
  SUPABASE_ANON: requireVar("VITE_SUPABASE_ANON_KEY"),
  GOOGLE_API_KEY: requireVar("VITE_GOOGLE_MAPS_API_KEY"),
  ONESIGNAL_APP_ID: e.VITE_ONESIGNAL_APP_ID as string | undefined,
  ENABLE_NOTIFS: (e.VITE_ENABLE_NOTIFS ?? "false") === "true",
};
