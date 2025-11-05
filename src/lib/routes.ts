export const ROUTES = {
  planning: {
    techniciens: "/operations/planning/techniciens",
    journalier: "/operations/planning/journalier",
  },
  calendrier: "/operations/calendrier",
  carte: "/operations/carte",
  missions: {
    list: "/operations/missions",
    create: "/operations/missions/new",
  },
  offres: "/operations/offres",
  urgences: "/operations/urgences",
  operationalCenter: "/operations",
} as const;
