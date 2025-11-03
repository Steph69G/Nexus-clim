import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { ENV } from "@/lib/env";

const GoogleMapsContext = createContext<typeof google | null>(null);

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [g, setG] = useState<typeof google | null>(null);

  useEffect(() => {
    let mounted = true;

    setOptions({
      key: ENV.GOOGLE_API_KEY,
      v: 'weekly',
      language: 'fr',
      region: 'FR',
      libraries: ['places', 'geometry', 'marker']
    });

    Promise.all([
      importLibrary('maps'),
      importLibrary('places')
    ])
      .then(() => {
        if (mounted) setG(google);
      })
      .catch(err => console.error('Google Maps load error:', err));

    return () => { mounted = false; };
  }, []);

  return <GoogleMapsContext.Provider value={g}>{children}</GoogleMapsContext.Provider>;
}

export function useGoogle() {
  const ctx = useContext(GoogleMapsContext);
  if (!ctx) throw new Error('Google Maps not loaded yet');
  return ctx;
}

export function useGoogleMaps() {
  const google = useGoogle();
  return {
    isLoaded: !!google,
    isLoading: !google,
    error: null,
    google
  };
}
