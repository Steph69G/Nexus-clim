/*
  # Ajout des statuts de cycle de vie complet pour les missions

  ## Modifications

  1. **Nouveaux statuts**
     - "TRAVAUX_TERMINÉS" : ST/SAL déclare avoir fini les travaux
     - "VALIDÉ_CLIENT" : Client valide les travaux (après intervention_report)
     - "FACTURÉ" : Facture générée
     - "PAYÉ" : Paiement reçu
  
  2. **Nouveaux champs de dates**
     - `work_completed_at` : Date de fin des travaux déclarée par ST/SAL
     - `client_validated_at` : Date validation client
     - `invoiced_at` : Date facturation
     - `paid_at` : Date paiement

  ## Cycle de vie complet
  
  Nouveau → PUBLIÉE → En cours → TRAVAUX_TERMINÉS → VALIDÉ_CLIENT → FACTURÉ → PAYÉ (= Terminé)

  ## Notes importantes
  
  - Le statut "Terminé" signifie maintenant : travaux + validation + paiement complets
  - Les dates permettent de suivre chaque étape
*/

-- 1. Ajouter les nouveaux champs de dates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'work_completed_at'
  ) THEN
    ALTER TABLE missions ADD COLUMN work_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'client_validated_at'
  ) THEN
    ALTER TABLE missions ADD COLUMN client_validated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'invoiced_at'
  ) THEN
    ALTER TABLE missions ADD COLUMN invoiced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE missions ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

-- 2. Mettre à jour la contrainte de statut avec les nouveaux statuts
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_status_check;

ALTER TABLE missions 
ADD CONSTRAINT missions_status_check 
CHECK (status IN (
  'Nouveau', 
  'PUBLIÉE', 
  'En cours', 
  'TRAVAUX_TERMINÉS',
  'VALIDÉ_CLIENT',
  'FACTURÉ',
  'Terminé',
  'Bloqué'
));