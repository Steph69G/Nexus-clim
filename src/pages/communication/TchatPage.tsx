import { useState, useEffect, useMemo } from 'react';
import { MessageCircle, Plus, Loader2, Archive } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { ConversationList } from '@/components/chat/ConversationList';
import { ConversationView } from '@/components/chat/ConversationView';
import { CreateConversationModal } from '@/components/chat/CreateConversationModal';
import { fetchMyConversations, fetchConversation } from '@/api/chat';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/components/chat/chatStore';
import { useChatSubscription } from '@/hooks/useChatSubscription';
import type { ConversationWithParticipants } from '@/types/database';

export default function TchatPage() {
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParticipants | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);

  const conversationsObj = useChatStore((state) => state.conversations);
  const setConversations = useChatStore((state) => state.setConversations);
  const setStoreUserId = useChatStore((state) => state.setCurrentUserId);

  const conversations = useMemo(() => {
    const arr = Object.values(conversationsObj);
    return arr.sort(
      (a, b) =>
        new Date(b.last_message_at ?? 0).getTime() -
        new Date(a.last_message_at ?? 0).getTime()
    );
  }, [conversationsObj]);

  useChatSubscription();

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [showArchived, currentUserId]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);
    setStoreUserId(user.id);
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      console.log('[TchatPage] Loading conversations, showArchived:', showArchived);
      const convs = await fetchMyConversations(showArchived);
      console.log('[TchatPage] Loaded conversations:', convs.length, convs);
      setConversations(convs);

      if (convs.length > 0 && !selectedConversation) {
        console.log('[TchatPage] Auto-selecting first conversation:', convs[0].id);
        const fullConv = await fetchConversation(convs[0].id);
        console.log('[TchatPage] Loaded full conversation:', fullConv);
        if (fullConv) setSelectedConversation(fullConv);
      }
    } catch (error) {
      console.error('[TchatPage] Error loading conversations:', error);
      alert(`Erreur de chargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      const conv = await fetchConversation(conversationId);
      if (conv) setSelectedConversation(conv);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleConversationCreated = async (conversationId: string) => {
    await loadConversations();
    await handleSelectConversation(conversationId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <BackButton to="/admin/communication" label="Retour à la Communication" />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 mt-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Tchat en Temps Réel</h1>
                <p className="text-slate-600">
                  Conversations instantanées avec votre équipe
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvelle conversation
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
          <div className="grid grid-cols-12 h-full">
            <div className="col-span-4 border-r border-slate-200 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Conversations</h3>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      showArchived
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                    title={showArchived ? "Masquer les archivées" : "Afficher les archivées"}
                  >
                    <Archive className="w-4 h-4" />
                    {showArchived ? "Actives" : "Archives"}
                  </button>
                </div>
              </div>
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id}
                onSelect={handleSelectConversation}
                currentUserId={currentUserId}
              />
            </div>

            <div className="col-span-8 flex flex-col">
              {selectedConversation ? (
                <ConversationView
                  conversation={selectedConversation}
                  currentUserId={currentUserId}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium mb-2">
                      Sélectionnez une conversation
                    </p>
                    <p className="text-sm text-slate-500">
                      Ou créez-en une nouvelle pour commencer
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateConversationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleConversationCreated}
        currentUserId={currentUserId}
      />
    </div>
  );
}
