/*
  # Phase 3 - Création du bucket documents

  1. Bucket Storage
    - Créer bucket `documents` pour PDF (factures, devis, rapports)
    - Configuration publique pour accès client

  2. Sécurité
    - Policies RLS sur bucket
    - Admins: accès complet
    - Clients: lecture seule leurs documents
    - ST: pas d'accès direct

  3. Notes
    - Les Edge Functions upload-eront les PDF générés ici
    - Référencé automatiquement dans `client_portal_documents`
*/

-- Créer le bucket documents (public pour génération URL signée)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Admins peuvent tout faire
CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND
  (auth.jwt()->>'role')::text = 'admin'
)
WITH CHECK (
  bucket_id = 'documents' AND
  (auth.jwt()->>'role')::text = 'admin'
);

-- Policy: Clients peuvent lire leurs propres documents
CREATE POLICY "Clients can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Le chemin contient leur client_id
    (storage.foldername(name))[1] IN (
      SELECT 'invoices/' || uc.client_id::text
      FROM user_clients uc
      WHERE uc.user_id = auth.uid()
      UNION
      SELECT 'quotes/' || uc.client_id::text
      FROM user_clients uc
      WHERE uc.user_id = auth.uid()
      UNION
      SELECT 'reports/' || uc.client_id::text
      FROM user_clients uc
      WHERE uc.user_id = auth.uid()
    )
  )
);

-- Policy: Service role pour Edge Functions (upload via service_role_key)
-- Pas de policy nécessaire car service_role bypass RLS
