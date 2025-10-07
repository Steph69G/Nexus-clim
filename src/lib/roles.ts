// Mapping des rôles DB vers les rôles UI
export const DB_TO_UI_ROLE_MAP = {
  'ADMIN': 'admin',
  'DISPATCH': 'admin', // DISPATCH est aussi un admin dans l'UI
  'TECH': 'tech',
  'ST': 'st',
  'SAL': 'sal',
  'CLIENT': 'client',
  'USER': 'st', // Fallback pour les anciens comptes
} as const;

export const UI_TO_DB_ROLE_MAP = {
  'admin': 'ADMIN',
  'tech': 'TECH',
  'st': 'ST',
  'sal': 'SAL',
  'client': 'CLIENT',
} as const;

export type DbRole = keyof typeof DB_TO_UI_ROLE_MAP;
export type UiRole = keyof typeof UI_TO_DB_ROLE_MAP;

export function mapDbRoleToUi(dbRole: string | null): UiRole | null {
  if (!dbRole) return null;
  const upperRole = dbRole.toUpperCase() as DbRole;
  return DB_TO_UI_ROLE_MAP[upperRole] || 'st'; // Fallback vers 'st' au lieu de null
}

export function mapUiRoleToDb(uiRole: string | null): DbRole | null {
  if (!uiRole) return null;
  const lowerRole = uiRole.toLowerCase() as UiRole;
  return UI_TO_DB_ROLE_MAP[lowerRole] || null;
}

export const roleToPath: Record<UiRole, string> = {
  admin: "/admin",
  tech: "/tech",
  st: "/offers",
  sal: "/offers",
  client: "/client",
};

export const fallbackPath = "/";