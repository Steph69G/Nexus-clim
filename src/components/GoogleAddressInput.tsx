import { useEffect, useRef } from "react";
import { ENV } from "../lib/env";

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

  useEffect(() => {
    let cleanup = () => {};

    async function initAutocomplete() {
      try {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${ENV.GOOGLE_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = reject;
          if (!document.querySelector(`script[src="${script.src}"]`)) {
            document.head.appendChild(script);
          } else {
            resolve();
          }
        });

        const input = inputRef.current;
        if (!input) return;

        const google = (window as any).google;
        if (!google?.maps?.places?.Autocomplete) {
          console.error("Google Maps Autocomplete non disponible");
          return;
        }

        const ac = new google.maps.places.Autocomplete(input, {
          fields: ["address_components", "geometry", "formatted_address", "place_id"],
          types: ["address"],
          componentRestrictions: { country: "fr" },
        });

        const listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();

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

        cleanup = () => {
          try {
            google.maps.event.removeListener(listener);
          } catch (e) {}
        };
      } catch (err) {
        console.error("Erreur chargement Google Maps:", err);
      }
    }

    initAutocomplete();

    return () => cleanup();
  }, [onAddressSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      className={`w-full border rounded px-3 py-2 ${className}`}
      placeholder={placeholder}
      defaultValue={initialValue}
    />
  );
}
