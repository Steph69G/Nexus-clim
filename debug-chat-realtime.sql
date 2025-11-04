-- ============================================
-- DIAGNOSTIC CHAT REALTIME
-- ============================================

-- 1️⃣ Vérifier si Realtime est activé sur les tables
SELECT
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('chat_messages', 'conversations', 'conversation_participants')
ORDER BY tablename;

-- Si la query ci-dessus ne retourne RIEN pour chat_messages, c'est le problème !

-- 2️⃣ Vérifier les policies RLS sur chat_messages
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY cmd;

-- 3️⃣ Vérifier qu'un user est bien participant d'une conversation
-- Remplace '78e2ec61-0771-400d-935e-e4107b4c1af9' par ton user_id
SELECT
  cp.conversation_id,
  cp.user_id,
  c.title,
  cp.role,
  'User is participant' as status
FROM conversation_participants cp
JOIN conversations c ON c.id = cp.conversation_id
WHERE cp.user_id = '78e2ec61-0771-400d-935e-e4107b4c1af9'
  AND cp.conversation_id = '988aef92-c682-4bbf-acef-882a6bc6f7fd';

-- 4️⃣ Tester la policy SELECT manuellement
-- Remplace l'UUID par ta conversation
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '78e2ec61-0771-400d-935e-e4107b4c1af9';

SELECT id, conversation_id, text, sender_id, created_at
FROM chat_messages
WHERE conversation_id = '988aef92-c682-4bbf-acef-882a6bc6f7fd'
ORDER BY created_at DESC
LIMIT 5;

RESET ROLE;

-- ============================================
-- FIX SI REALTIME N'EST PAS ACTIVÉ
-- ============================================

-- Activer Realtime sur chat_messages
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Activer Realtime sur conversations
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Activer Realtime sur conversation_participants
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
