/*
  # Ajout du statut "CONFIRMÉE" pour les missions

  ## Modifications

  1. **Nouveau statut**
     - "CONFIRMÉE" : Le rendez-vous est confirmé par le ST/SAL

  ## Workflow simple pour ST/SAL
  
  Nouveau → PUBLIÉE → En cours (acceptée) → CONFIRMÉE (RDV validé) → TERMINÉE

  ## Notes
  
  - Ce statut permet de distinguer entre "acceptée" et "RDV confirmé"
  - Pour les SAL, la transition est automatique (admin fixe le RDV)
  - Pour les ST, ils confirment ou modifient le RDV proposé
*/

ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_status_check;

ALTER TABLE missions 
ADD CONSTRAINT missions_status_check 
CHECK (status IN (
  'Nouveau', 
  'PUBLIÉE', 
  'En cours',
  'CONFIRMÉE',
  'TRAVAUX_TERMINÉS',
  'VALIDÉ_CLIENT',
  'FACTURÉ',
  'TERMINÉE',
  'Terminé',
  'Bloqué'
));
