export function normalizeMissionStatus(s?: string | null) {
  if (!s) return null;
  const v = s.toLowerCase();
  if (["publiée", "publiee", "published", "publie"].includes(v)) return "publiee";
  if (["acceptée", "acceptee", "accepted"].includes(v)) return "acceptee";
  if (["planifiée", "planifiee", "planifie"].includes(v)) return "planifiee";
  if (["en route", "en_route"].includes(v)) return "en_route";
  if (["en intervention", "en_intervention"].includes(v)) return "en_intervention";
  if (["à suivre", "a suivre", "a_suivre"].includes(v)) return "a_suivre";
  if (["terminée", "terminee"].includes(v)) return "terminee";
  if (["facturable"].includes(v)) return "facturable";
  if (["facturée", "facturee"].includes(v)) return "facturee";
  if (["payée", "payee"].includes(v)) return "payee";
  if (["clôturée", "cloturee"].includes(v)) return "cloturee";
  if (["annulée", "annulee", "annule"].includes(v)) return "annulee";
  if (["brouillon", "draft"].includes(v)) return "brouillon";
  return v; // laisse passer si déjà au bon format
}
