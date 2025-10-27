-- =====================================================
-- DEBUG SCRIPT: Conversation RLS Issues
-- =====================================================
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Vérifier toutes les policies sur conversations
SELECT
  policyname,
  cmd,
  roles,
  qual AS "using_clause",
  with_check AS "with_check_clause"
FROM pg_policies
WHERE tablename = 'conversations'
ORDER BY cmd, policyname;

-- 2. Vérifier toutes les policies sur conversation_participants
SELECT
  policyname,
  cmd,
  roles,
  qual AS "using_clause",
  with_check AS "with_check_clause"
FROM pg_policies
WHERE tablename = 'conversation_participants'
ORDER BY cmd, policyname;

-- 3. Vérifier que RLS est bien activé
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'conversation_participants', 'chat_messages');

-- 4. Tester l'insertion manuellement (REMPLACER 'YOUR-USER-ID' par votre vrai user ID)
-- Pour obtenir votre user ID, allez dans Authentication > Users et copiez votre UUID

-- TEST 1: Insertion simple
INSERT INTO conversations (type, created_by)
VALUES ('direct', 'YOUR-USER-ID-HERE')
RETURNING *;

-- Si ça échoue, tester avec service_role (devrait marcher):
-- (ce test nécessite d'être en mode service_role dans le SQL Editor)
