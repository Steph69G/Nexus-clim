/*
  # Enable Realtime on Chat Tables

  1. Purpose
    - Enable Realtime broadcasts on chat_messages table
    - Enable Realtime broadcasts on conversations table
    - Enable Realtime broadcasts on conversation_participants table

  2. Changes
    - Add chat_messages to supabase_realtime publication
    - Add conversations to supabase_realtime publication
    - Add conversation_participants to supabase_realtime publication

  3. Security
    - Realtime respects RLS policies (already in place)
    - Users will only receive events for messages in their conversations
    - No additional security changes needed

  4. Impact
    - Enables instant message delivery via WebSocket
    - Enables instant conversation updates
    - No breaking changes to existing code
*/

-- Enable Realtime on chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable Realtime on conversations
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable Realtime on conversation_participants
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
