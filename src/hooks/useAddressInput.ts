import { useState, useCallback } from "react";

export type AddressData = {
  address: string;
  city: string;
  zip: string;
  lat: number | null;
  lng: number | null;
};

export type AddressInputState = AddressData & {
  isGooglePlaces: boolean;
  fullAddress: string;
};

export function useAddressInput(initialData?: Partial<AddressData>) {
  const [addressState, setAddressState] = useState<AddressInputState>({
    address: initialData?.address || "",
    city: initialData?.city || "",
    zip: initialData?.zip || "",
    lat: initialData?.lat || null,
    lng: initialData?.lng || null,
    isGooglePlaces: false,
    fullAddress: initialData?.address && initialData?.city
      ? `${initialData.address}, ${initialData.city}`
      : "",
  });

  const handleGooglePlacesSelect = useCallback((data: AddressData) => {
    setAddressState({
      address: data.address,
      city: data.city,
      zip: data.zip,
      lat: data.lat,
      lng: data.lng,
      isGooglePlaces: true,
      fullAddress: `${data.address}, ${data.city}`,
    });
  }, []);

  const handleManualChange = useCallback((field: keyof AddressData, value: any) => {
    setAddressState((prev) => ({
      ...prev,
      [field]: value,
      isGooglePlaces: false,
    }));
  }, []);

  const clearAddress = useCallback(() => {
    setAddressState({
      address: "",
      city: "",
      zip: "",
      lat: null,
      lng: null,
      isGooglePlaces: false,
      fullAddress: "",
    });
  }, []);

  const hasValidAddress = useCallback(() => {
    return addressState.address.trim() !== "" && addressState.city.trim() !== "";
  }, [addressState.address, addressState.city]);

  const getAddressData = useCallback((): AddressData => {
    return {
      address: addressState.address,
      city: addressState.city,
      zip: addressState.zip,
      lat: addressState.lat,
      lng: addressState.lng,
    };
  }, [addressState]);

  return {
    addressState,
    handleGooglePlacesSelect,
    handleManualChange,
    clearAddress,
    hasValidAddress,
    getAddressData,
  };
}
