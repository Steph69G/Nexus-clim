export type AppRole = 'admin' | 'manager' | 'tech' | 'st' | 'client' | 'sal';

export const VisibilityMatrix = {
  'feature:planning.multitech': ['admin', 'manager', 'sal'],
  'feature:planning.journalier': ['admin', 'manager', 'tech', 'sal'],
  'feature:calendar.global': ['admin', 'manager', 'tech', 'st', 'sal'],
  'feature:map.interventions': ['admin', 'manager', 'tech', 'st', 'sal'],
  'feature:mission.list': ['admin', 'manager', 'tech', 'sal'],
  'feature:mission.create': ['admin', 'manager', 'sal'],
  'feature:offers.published': ['admin', 'manager', 'st', 'sal'],
  'feature:urgent.repairs': ['admin', 'manager', 'tech', 'st', 'sal'],
} as const;

export type Permission = keyof typeof VisibilityMatrix;

export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return VisibilityMatrix[permission].includes(role as any);
}

export function getCurrentRole(): AppRole | null {
  return null;
}
