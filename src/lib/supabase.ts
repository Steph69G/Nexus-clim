// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Validate environment variables
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. Please add it to your .env file.'
  );
}

if (!anon) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. Please add it to your .env file.'
  );
}

if (!url.startsWith('http://') && !url.startsWith('https://')) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL format: "${url}". Must be a valid HTTP or HTTPS URL (e.g., https://your-project-id.supabase.co)`
  );
}

// Custom fetch function to handle refresh token errors
const customFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  
  // If we get a 400 error, check if it's a refresh token issue
  if (response.status === 400) {
    try {
      const errorData = await response.clone().json();
      if (errorData.code === 'refresh_token_not_found' || 
          errorData.message?.includes('Invalid Refresh Token')) {
        // Clear all Supabase-related data from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('Cleared invalid refresh token from localStorage');
        
        // Reload the page to reset authentication state
        window.location.reload();
      }
    } catch (e) {
      // If we can't parse the error, just continue
    }
  }
  
  return response;
};

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
  global: {
    fetch: customFetch,
  },
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
});

// Petit log utile en debug
console.log("✅ Supabase OK:", url);