export const MAP_INVOICE_UI2DB = {
  draft:   ["brouillon"],
  sent:    ["envoye", "envoyé"],
  paid:    ["paye", "payé"],
  overdue: ["en_retard"],
  open:    ["brouillon", "envoye", "envoyé"],
  closed:  ["paye", "payé"],
} as const;

export const MAP_QUOTE_UI2DB = {
  draft:             ["brouillon"],
  awaiting_approval: ["en_attente_validation"],
  approved:          ["approuve", "approuvé"],
  rejected:          ["refuse", "refusé"],
  converted:         ["converti"],
  open:              ["brouillon", "en_attente_validation"],
  closed:            ["approuve", "approuvé", "refuse", "refusé", "converti"],
} as const;

export function toDbArray<
  T extends Record<string, readonly string[]>,
  K extends keyof T
>(map: T, ui: string | undefined, fallbackKey: K): readonly string[] {
  if (!ui) return map[fallbackKey];
  const db = (map as Record<string, readonly string[]>)[ui];
  return db?.length ? db : map[fallbackKey];
}
