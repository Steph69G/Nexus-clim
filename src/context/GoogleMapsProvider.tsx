import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ENV } from "@/lib/env";

type GoogleMapsContextType = {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  google: typeof google | null;
};

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

let scriptLoadPromise: Promise<void> | null = null;
let isScriptLoaded = false;
let scriptError: string | null = null;

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(scriptError);

  useEffect(() => {
    if (isScriptLoaded) {
      setIsLoaded(true);
      return;
    }

    if (scriptError) {
      setError(scriptError);
      return;
    }

    if (scriptLoadPromise) {
      setIsLoading(true);
      scriptLoadPromise
        .then(() => {
          setIsLoaded(true);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message || "Failed to load Google Maps");
          setIsLoading(false);
        });
      return;
    }

    setIsLoading(true);

    scriptLoadPromise = new Promise<void>((resolve, reject) => {
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkInterval = setInterval(() => {
          if ((window as any).google?.maps?.places?.Autocomplete) {
            clearInterval(checkInterval);
            isScriptLoaded = true;
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (!(window as any).google?.maps?.places?.Autocomplete) {
            const error = "Google Maps API timeout";
            scriptError = error;
            reject(new Error(error));
          }
        }, 10000);
        return;
      }

      const callbackName = `initGoogleMaps_${Date.now()}`;

      (window as any)[callbackName] = () => {
        delete (window as any)[callbackName];
        isScriptLoaded = true;
        resolve();
      };

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${ENV.GOOGLE_API_KEY}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete (window as any)[callbackName];
        const error = "Failed to load Google Maps script";
        scriptError = error;
        reject(new Error(error));
      };

      document.head.appendChild(script);
    });

    scriptLoadPromise
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load Google Maps");
        setIsLoading(false);
      });
  }, []);

  const google = isLoaded ? (window as any).google : null;

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, isLoading, error, google }}>
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
