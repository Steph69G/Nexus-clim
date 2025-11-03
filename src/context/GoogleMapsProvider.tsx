import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ENV } from "@/lib/env";

type GoogleMapsContextType = {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  google: typeof google | null;
};

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

let loaderPromise: Promise<void> | null = null;
let isGoogleLoaded = false;

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(isGoogleLoaded);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isGoogleLoaded) {
      setIsLoaded(true);
      return;
    }

    if (!loaderPromise) {
      setOptions({
        key: ENV.GOOGLE_API_KEY,
        v: 'weekly',
      });

      loaderPromise = importLibrary('places').then(() => {
        isGoogleLoaded = true;
      });
    }

    setIsLoading(true);

    loaderPromise
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
        setError(err.message || 'Failed to load Google Maps');
        setIsLoading(false);
      });
  }, []);

  const googleInstance = isLoaded && typeof window !== 'undefined' ? (window as any).google : null;

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
