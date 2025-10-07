// src/lib/missionSanitize.ts
// D'après la contrainte DB, seuls ces 4 statuts sont acceptés
export const STATUS_MAP_UI_TO_DB: Record<string, string> = {
  // Mapping vers les 4 statuts acceptés par la contrainte missions_status_check
  'BROUILLON_INCOMPLET': 'Nouveau',  // Admin n'a pas fini de remplir
  'BROUILLON': 'Nouveau',            // Annonce finie mais non publiée
  'PUBLIEE': 'Nouveau', 
  'ACCEPTEE': 'En cours',
  'PLANIFIEE': 'En cours',
  'EN_ROUTE': 'En cours',
  'EN_INTERVENTION': 'En cours',
  'TERMINEE': 'Terminé',
  'FACTURABLE': 'Terminé',
  'FACTUREE': 'Terminé',
  'PAYEE': 'Terminé',
  'CLOTUREE': 'Terminé',
  'ANNULEE': 'Bloqué',
  
  // Variantes avec accents
  'Brouillon incomplet': 'Nouveau',
  'Brouillon': 'Nouveau',
  'Publiée': 'Nouveau',
  'Acceptée': 'En cours',
  'Planifiée': 'En cours',
  'En route': 'En cours',
  'En intervention': 'En cours',
  'Terminée': 'Terminé',
  'Facturable': 'Terminé',
  'Facturée': 'Terminé',
  'Payée': 'Terminé',
  'Clôturée': 'Terminé',
  'Annulée': 'Bloqué',
  
  // Statuts déjà conformes (pass-through)
  'Nouveau': 'Nouveau',
  'En cours': 'En cours',
  'Bloqué': 'Bloqué',
  'Terminé': 'Terminé',
};

export const TYPE_MAP_UI_TO_DB: Record<string, string> = {
  'Dépannage': 'DEP',
  'Entretien': 'ENTR',
  'Pose': 'POSE',
  'Audit': 'AUDIT',
  // pass-through
  'DEP':'DEP','ENTR':'ENTR','POSE':'POSE','AUDIT':'AUDIT',
};

type Patch = Record<string, any>;

/** 
 * Nettoie le payload avant PATCH:
 * - mappe status/type vers les valeurs DB (sans accents)
 * - supprime les champs vides ("") pour éviter les erreurs de cast
 * - remplace "" dates par null
 */
export function sanitizeMissionPatch(input: Patch): Patch {
  const out: Patch = {};

  console.log("sanitizeMissionPatch input:", input);

  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;

    if (k === 'status' && v != null) {
      const statusStr = String(v);
      console.log("Processing status:", statusStr);
      if (statusStr.trim() === '') {
        out.status = null;
        continue;
      }
      const mapped = STATUS_MAP_UI_TO_DB[statusStr];
      console.log("Mapped status:", mapped);
      // Seulement utiliser les statuts mappés, ignorer les autres
      if (mapped) {
        out.status = mapped;
        console.log("Setting status to:", mapped);
      }
      // Si pas de mapping trouvé, ne pas inclure le champ status
      continue;
    }

    if (k === 'type' && v != null) {
      const mapped = TYPE_MAP_UI_TO_DB[String(v)] ?? v;
      out.type = mapped;
      continue;
    }

    // dates/horaires: envoyer null plutôt que "" 
    if (['scheduled_start','scheduled_window_start','scheduled_window_end','accepted_at','expires_at','planned_at','finished_at','invoiced_at','paid_at','closed_at','updated_at','created_at'].includes(k)) {
      if (v === '' || v === null) { out[k] = null; continue; }
    }

    // champs texte: ne pas envoyer "" (laisser intact en DB)
    if (typeof v === 'string' && v.trim() === '') continue;

    out[k] = v;
  }

  return out;
}
