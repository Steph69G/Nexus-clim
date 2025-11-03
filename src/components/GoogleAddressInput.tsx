import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/context/GoogleMapsProvider";

export type ParsedAddress = {
  address: string | null;
  city: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
};

type Props = {
  initialValue?: string;
  onSelect?: (parsed: ParsedAddress) => void;
  placeholder?: string;
  className?: string;
};

export default function GoogleAddressInput({
  initialValue,
  onSelect,
  placeholder = "Saisir une adresse",
  className = "",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { isLoaded, isLoading, error } = useGoogleMaps();

  useEffect(() => {
    if (!hostRef.current || !isLoaded) return;

    const gmaps = (window as any).google?.maps;
    if (!gmaps?.places) {
      console.warn("Google Places non disponible : vérifie le chargement du script et 'libraries=places'.");
      return;
    }

    const el = document.createElement("gmpx-place-autocomplete") as any;
    el.setAttribute("placeholder", placeholder);
    if (initialValue) el.setAttribute("value", initialValue);

    const handler = async (e: Event) => {
      try {
        const value = (e.target as any).value as string;
        if (!value) return;

        const geocoder = new gmaps.Geocoder();
        geocoder.geocode({ address: value }, (results: any, status: any) => {
          if (status !== "OK" || !results?.[0]) {
            onSelect?.({
              address: value,
              city: null,
              zip: null,
              lat: null,
              lng: null,
            });
            return;
          }

          const r = results[0];
          const loc = r.geometry?.location;
          const components = r.address_components ?? [];

          const parsed: ParsedAddress = {
            address: r.formatted_address ?? value,
            city: extractCity(components),
            zip: extractZip(components),
            lat: loc ? loc.lat() : null,
            lng: loc ? loc.lng() : null,
          };

          onSelect?.(parsed);
        });
      } catch (err) {
        console.error("GoogleAddressInput error:", err);
      }
    };

    el.addEventListener("gmpx-placechange", handler);
    hostRef.current.appendChild(el);

    return () => {
      el.removeEventListener("gmpx-placechange", handler);
      el.remove();
    };
  }, [initialValue, onSelect, placeholder, isLoaded]);

  if (error) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          className={`w-full border rounded px-3 py-2 border-red-300 ${className}`}
          placeholder={placeholder}
          defaultValue={initialValue}
          disabled
        />
        <p className="text-xs text-red-600">
          ⚠️ Google Maps non disponible: {error}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative">
        <input
          type="text"
          className={`w-full border rounded px-3 py-2 ${className}`}
          placeholder="Chargement de Google Maps..."
          disabled
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return <div ref={hostRef} className={`w-full ${className}`} />;
}

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function extractZip(components: AddressComponent[]): string | null {
  const comp = components.find((c) => c.types.includes("postal_code"));
  return comp?.long_name ?? null;
}

function extractCity(components: AddressComponent[]): string | null {
  const keys = ["locality", "postal_town", "administrative_area_level_2"];
  for (const k of keys) {
    const comp = components.find((c) => c.types.includes(k));
    if (comp?.long_name) return comp.long_name;
  }
  const comp = components.find((c) => c.types.includes("administrative_area_level_1"));
  return comp?.long_name ?? null;
}
