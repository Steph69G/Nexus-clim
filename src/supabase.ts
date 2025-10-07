import { createClient } from "@supabase/supabase-js";
import { ENV } from "./lib/env";

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

console.log("✅ Supabase OK:", ENV.SUPABASE_URL);
