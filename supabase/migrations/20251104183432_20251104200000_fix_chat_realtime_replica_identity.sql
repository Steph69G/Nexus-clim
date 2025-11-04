/*
  # Fix Chat Realtime Replica Identity

  ## Problem
  - Realtime broadcast was enabled but not receiving INSERT events
  - Tables had DEFAULT replica identity (only primary key)
  - Supabase Realtime requires FULL replica identity to broadcast complete row data

  ## Solution
  - Set REPLICA IDENTITY FULL on chat tables
  - Allows Realtime to broadcast all column values on INSERT/UPDATE/DELETE

  ## Changes
  1. Set FULL replica identity on:
     - chat_messages
     - conversations
     - conversation_participants

  ## Impact
  - Realtime will now broadcast INSERT events with full row data
  - Slightly increased WAL size (acceptable for chat functionality)
  - Required for Supabase Realtime to work properly
*/

-- Enable FULL replica identity for Realtime broadcast
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
