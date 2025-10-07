/*
  # Ajouter la policy INSERT manquante pour user_clients

  ## Problème
  Les clients ne peuvent pas créer/modifier leur entrée dans user_clients
  car il manque la policy INSERT.

  ## Solution
  Ajouter les policies INSERT et UPSERT pour que les clients puissent
  gérer leurs propres données.

  ## Policies ajoutées
  - INSERT : Les clients peuvent créer leur propre entrée
  - Note : Les policies SELECT et UPDATE existent déjà
*/

-- Policy INSERT pour les clients (création de leur propre entrée)
CREATE POLICY "User clients can insert own data"
  ON user_clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
