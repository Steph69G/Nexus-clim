import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/context/GoogleMapsProvider";

type AddressComponents = {
  address: string;
  city: string;
  zip: string;
  lat: number | null;
  lng: number | null;
};

type Props = {
  onAddressSelect: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
};

export default function GoogleAddressInput({
  onAddressSelect,
  placeholder = "Tapez une adresse...",
  className = "",
  initialValue = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isLoaded, isLoading, error, google } = useGoogleMaps();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !google?.maps?.places?.Autocomplete) {
      setIsReady(false);
      return;
    }

    const input = inputRef.current;
    if (!input) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;
    let listener: google.maps.MapsEventListener | null = null;

    try {
      autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ["address_components", "geometry", "formatted_address", "place_id"],
        types: ["address"],
        componentRestrictions: { country: "fr" },
      });

      listener = autocomplete.addListener("place_changed", () => {
        if (!autocomplete) return;

        const place = autocomplete.getPlace();

        const comps = place.address_components ?? [];
        let streetNumber = "";
        let route = "";
        let city = "";
        let zip = "";

        comps.forEach((c: any) => {
          const t = c.types || [];
          if (t.includes("street_number")) streetNumber = c.long_name ?? "";
          if (t.includes("route")) route = c.long_name ?? "";
          if (t.includes("locality")) city = c.long_name ?? "";
          if (!city && t.includes("postal_town")) city = c.long_name ?? "";
          if (t.includes("postal_code")) zip = c.long_name ?? "";
        });

        const full = streetNumber || route ? `${streetNumber} ${route}`.trim() : place.formatted_address ?? "";
        const loc = place.geometry?.location;
        const lat = typeof loc?.lat === "function" ? loc.lat() : null;
        const lng = typeof loc?.lng === "function" ? loc.lng() : null;

        if (!city) {
          const formatted = place.formatted_address ?? "";
          const parts = formatted.split(",");
          if (parts.length >= 2) {
            const maybeCity = parts[1].trim().split(" ")[0];
            if (maybeCity && maybeCity.length > 2) city = maybeCity;
          }
        }

        onAddressSelect({
          address: full || place.formatted_address || "",
          city: city || "Ville non trouvée",
          zip: zip || "",
          lat,
          lng,
        });
      });

      setIsReady(true);
    } catch (err) {
      console.error("Erreur initialisation autocomplete:", err);
      setIsReady(false);
    }

    return () => {
      if (listener) {
        try {
          google.maps.event.removeListener(listener);
        } catch (e) {
          console.error("Erreur cleanup listener:", e);
        }
      }
    };
  }, [isLoaded, google, onAddressSelect]);

  if (error) {
    return (
      <div className="space-y-2">
        <input
          ref={inputRef}
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

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className={`w-full border rounded px-3 py-2 ${className}`}
        placeholder={isLoading ? "Chargement de Google Maps..." : placeholder}
        defaultValue={initialValue}
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}
      {isReady && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <span className="text-green-600 text-xs">✓</span>
        </div>
      )}
    </div>
  );
}
