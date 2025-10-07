// src/components/GoogleAddressInput.tsx
import { useEffect, useRef, useState } from "react";

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
  /** Forcer l'ancien Autocomplete (déconseillé — utile uniquement si ton projet y a encore accès) */
  forceLegacy?: boolean;
  /** Restreindre à un pays (ISO-2) — ex: 'fr' */
  countryCode?: string;
};

export default function GoogleAddressInput({
  onAddressSelect,
  placeholder = "Tapez une adresse...",
  className = "",
  initialValue = "",
  forceLegacy = false,
  countryCode = "fr",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null); // contiendra le web component OU l'input legacy
  const legacyInputRef = useRef<HTMLInputElement | null>(null);
  const instanceRef = useRef<any>(null); // PlaceAutocompleteElement OU legacy Autocomplete

  const [isLoaded, setIsLoaded] = useState(false);
  const [usingNewWidget, setUsingNewWidget] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // ---------------- Helpers ----------------
  const toPayload = (place: any): AddressComponents => {
    // NEW: place.{formattedAddress, location, addressComponents}
    // LEGACY: place.{formatted_address, geometry.location, address_components}
    const comps = place.addressComponents ?? place.address_components ?? [];
    let streetNumber = "";
    let route = "";
    let city = "";
    let zip = "";

    comps.forEach((c: any) => {
      const t = c.types || [];
      if (t.includes("street_number")) streetNumber = c.longText ?? c.long_name ?? "";
      if (t.includes("route")) route = c.longText ?? c.long_name ?? "";
      if (t.includes("locality")) city = c.longText ?? c.long_name ?? "";
      if (!city && t.includes("postal_town")) city = c.longText ?? c.long_name ?? "";
      if (t.includes("postal_code")) zip = c.longText ?? c.long_name ?? "";
    });

    const full =
      streetNumber || route
        ? `${streetNumber} ${route}`.trim()
        : place.formattedAddress ?? place.formatted_address ?? "";

    const loc = place.location ?? place.geometry?.location;
    const lat =
      typeof loc?.lat === "function" ? loc.lat() : typeof loc?.lat === "number" ? loc.lat : null;
    const lng =
      typeof loc?.lng === "function" ? loc.lng() : typeof loc?.lng === "number" ? loc.lng : null;

    if (!city) {
      const formatted = place.formattedAddress ?? place.formatted_address ?? "";
      const parts = formatted.split(",");
      if (parts.length >= 2) {
        const maybeCity = parts[1].trim().split(" ")[0];
        if (maybeCity && maybeCity.length > 2) city = maybeCity;
      }
    }

    return {
      address: full || place.formattedAddress || place.formatted_address || "",
      city: city || "Ville non trouvée",
      zip: zip || "",
      lat,
      lng,
    };
  };

  // ---------------- Charger Google Maps JS (async, moderne) ----------------
  useEffect(() => {
    // Déjà chargé ?
    // @ts-ignore
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Un script existe déjà ?
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const timer = setInterval(() => {
        // @ts-ignore
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(timer);
        }
      }, 100);
      return () => clearInterval(timer);
    }

    const apiKey =
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
    setDebugInfo(`API Key: ${apiKey ? "Present" : "Missing"}`);
    if (!apiKey) {
      console.error(
        "Google Maps API key is missing. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file"
      );
      return;
    }

    const script = document.createElement("script");
    // IMPORTANT: loading=async + libraries=places (requis pour importLibrary("places"))
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = async () => {
      try {
        // @ts-ignore
        if (typeof google.maps.importLibrary === "function") {
          // Charge explicitement la lib 'places' (nécessaire pour PlaceAutocompleteElement)
          // @ts-ignore
          await google.maps.importLibrary("places");
        }
        setIsLoaded(true);
      } catch (e) {
        console.error("importLibrary('places') failed:", e);
      }
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      setDebugInfo("Script loading failed");
    };
    document.head.appendChild(script);
  }, []);

  // ---------------- Initialiser nouveau widget OU fallback legacy ----------------
  useEffect(() => {
    if (!isLoaded || !containerRef.current || instanceRef.current) return;

    let destroyed = false;
    let cleanup = () => {};

    (async () => {
      // 1) Tentative NOUVEAU WIDGET (sauf si forceLegacy)
      if (!forceLegacy) {
        try {
          // @ts-ignore
          const PlaceAutocompleteElement = google.maps.places?.PlaceAutocompleteElement;
          if (PlaceAutocompleteElement && !destroyed) {
            // @ts-ignore
            const pac = new PlaceAutocompleteElement({
              includedRegionCodes: countryCode ? [countryCode] : undefined,
              // types: ["address"], // possible si tu veux restreindre au type "adresse" (selon tes besoins)
            });
            // placeholder + valeur initiale
            // @ts-ignore
            pac.placeholder = placeholder;
            if (initialValue) {
              // @ts-ignore
              pac.value = initialValue;
            }

            // Style & injection
            (pac as any).style.width = "100%";
            (pac as any).className = `block w-full ${className}`;
            containerRef.current!.innerHTML = "";
            containerRef.current!.appendChild(pac);

            // Événement de sélection
            pac.addEventListener("gmp-select", async (e: any) => {
              try {
                const prediction = e?.placePrediction;
                if (!prediction) return;
                const place = prediction.toPlace();
                await place.fetchFields({
                  fields: ["formattedAddress", "location", "addressComponents", "id"],
                });
                onAddressSelect(toPayload(place));
              } catch (err) {
                console.error("Place fetchFields error:", err);
              }
            });

            instanceRef.current = pac;
            setUsingNewWidget(true);
            cleanup = () => {
              try {
                pac.remove();
              } catch {}
            };
            return; // ✅ on reste sur le nouveau widget
          }
        } catch (e) {
          console.warn("New PlaceAutocompleteElement not available, will try legacy.", e);
        }
      }

      // 2) Fallback LEGACY (si accessible par ta clé/projet)
      try {
        // @ts-ignore
        const LegacyAutocomplete = google.maps.places?.Autocomplete;
        if (LegacyAutocomplete && !destroyed) {
          // Crée un <input>
          const input = document.createElement("input");
          input.type = "text";
          input.placeholder = placeholder;
          input.value = initialValue ?? "";
          input.className = `w-full border rounded px-3 py-2 ${className}`;

          containerRef.current!.innerHTML = "";
          containerRef.current!.appendChild(input);
          legacyInputRef.current = input;

          // @ts-ignore
          const ac = new LegacyAutocomplete(input, {
            types: ["address"],
            // @ts-ignore
            componentRestrictions: countryCode ? { country: [countryCode] } : undefined,
            fields: ["address_components", "formatted_address", "geometry", "place_id"],
          });

          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            onAddressSelect(toPayload(place));
          });

          instanceRef.current = ac;
          setUsingNewWidget(false);
          cleanup = () => {
            try {
              // rien à détruire de spécifique côté legacy
            } catch {}
          };
        } else {
          console.error(
            "Ni le nouveau PlaceAutocompleteElement ni le legacy Autocomplete ne sont disponibles. Vérifie l'activation de 'Places API (New)' + restrictions de clé."
          );
        }
      } catch (e) {
        console.error("Legacy Autocomplete unavailable:", e);
      }
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, [
    isLoaded,
    placeholder,
    initialValue,
    className,
    onAddressSelect,
    forceLegacy,
    countryCode,
  ]);

  // ---------------- Render ----------------
  return (
    <div className="relative">
      <div ref={containerRef} />

      {/* Infos clés / debug (optionnel) */}
      {(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && !import.meta.env.VITE_GOOGLE_API_KEY) && (
        <div className="text-xs text-amber-600 mt-1">
          ⚠️ Clé API Google Maps manquante. Ajoutez VITE_GOOGLE_MAPS_API_KEY ou VITE_GOOGLE_API_KEY dans .env
        </div>
      )}

      {!isLoaded && (
        <div className="absolute right-2 top-2">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {isLoaded && usingNewWidget !== null && (
        <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <span>✓</span>
          <span>
            Google Places prêt {usingNewWidget ? "(nouveau widget)" : "(legacy)"}
          </span>
        </div>
      )}

      {debugInfo && (
        <div className="text-xs text-blue-600 mt-1">
          🔍 Debug: {debugInfo} | Loaded: {isLoaded ? "Yes" : "No"}
        </div>
      )}
    </div>
  );
}
