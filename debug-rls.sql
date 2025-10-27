-- Script de debug RLS pour conversations
-- Exécuter dans Supabase SQL Editor en étant connecté

-- 1. Vérifier l'utilisateur actuel
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 2. Vérifier les policies sur conversations
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'conversations'
ORDER BY cmd, policyname;

-- 3. Tester l'insertion directe (doit échouer si pas de WITH CHECK)
-- NE PAS EXÉCUTER SI VOUS N'ÊTES PAS ADMIN
-- INSERT INTO conversations (type, created_by)
-- VALUES ('direct', auth.uid());

-- 4. Vérifier les policies sur conversation_participants
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'conversation_participants'
ORDER BY cmd, policyname;
