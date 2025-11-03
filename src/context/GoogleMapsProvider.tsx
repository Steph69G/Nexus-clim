import { Loader } from '@googlemaps/js-api-loader';
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ENV } from "@/lib/env";

type GoogleMapsContextType = {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  google: typeof google | null;
};

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

let loaderPromise: Promise<typeof google> | null = null;
let googleInstance: typeof google | null = null;

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(!!googleInstance);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (googleInstance) {
      setIsLoaded(true);
      return;
    }

    if (!loaderPromise) {
      const loader = new Loader({
        apiKey: ENV.GOOGLE_API_KEY,
        version: 'weekly',
        libraries: ['places'],
      });

      loaderPromise = loader.load();
    }

    setIsLoading(true);

    loaderPromise
      .then((g) => {
        googleInstance = g;
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
        setError(err.message || 'Failed to load Google Maps');
        setIsLoading(false);
      });
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, isLoading, error, google: googleInstance }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (context === undefined) {
    throw new Error("useGoogleMaps must be used within GoogleMapsProvider");
  }
  return context;
}
