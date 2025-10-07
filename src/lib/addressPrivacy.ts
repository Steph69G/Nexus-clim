/**
 * Utilitaires pour gérer la confidentialité des adresses
 */

export type PrivacyLevel = 'STREET_CITY' | 'CITY' | 'HIDE';

/**
 * Masque une adresse selon le niveau de confidentialité et si l'utilisateur a accepté la mission
 */
export function maskAddress(
  fullAddress: string | null,
  city: string | null,
  privacyLevel: PrivacyLevel = 'STREET_CITY',
  hasAccepted: boolean = false
): string {
  // Si l'utilisateur a accepté la mission, montrer l'adresse complète
  if (hasAccepted && fullAddress) {
    return fullAddress;
  }

  // Sinon, appliquer le masquage selon le niveau de confidentialité
  switch (privacyLevel) {
    case 'HIDE':
      return 'Adresse masquée';
    
    case 'CITY':
      return city || 'Ville non spécifiée';
    
    case 'STREET_CITY':
    default:
      if (!fullAddress) return city || 'Adresse non spécifiée';
      
      // Extraire le nom de rue sans le numéro
      const parts = fullAddress.split(' ');
      if (parts.length <= 1) return city || fullAddress;
      
      // Supprimer le premier élément s'il ressemble à un numéro
      const firstPart = parts[0];
      const isNumber = /^\d+[a-zA-Z]?$/.test(firstPart);
      
      if (isNumber) {
        // Garder le nom de rue + ville
        const streetName = parts.slice(1).join(' ');
        return city ? `${streetName}, ${city}` : streetName;
      }
      
      // Si pas de numéro détecté, retourner l'adresse complète
      return fullAddress;
  }
}

/**
 * Masque les coordonnées GPS pour éviter la géolocalisation précise
 */
export function maskCoordinates(
  lat: number | null,
  lng: number | null,
  hasAccepted: boolean = false
): { lat: number | null; lng: number | null } {
  if (hasAccepted || !lat || !lng) {
    return { lat, lng };
  }

  // Réduire la précision à ~100m (3 décimales au lieu de 5+)
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}

/**
 * Détermine si l'utilisateur a accepté une mission spécifique
 */
export function hasUserAcceptedMission(
  missionAssignedUserId: string | null,
  currentUserId: string | null
): boolean {
  return !!(missionAssignedUserId && currentUserId && missionAssignedUserId === currentUserId);
}