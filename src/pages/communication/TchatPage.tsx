import { useState, useEffect } from 'react';
import { MessageCircle, Plus, Loader2, Archive } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { ConversationList } from '@/components/chat/ConversationList';
import { ConversationView } from '@/components/chat/ConversationView';
import { CreateConversationModal } from '@/components/chat/CreateConversationModal';
import { fetchMyConversations, fetchConversation, archiveConversation, leaveConversation } from '@/api/chat';
import { supabase } from '@/lib/supabase';
import type { ConversationWithParticipants } from '@/types/database';

export default function TchatPage() {
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParticipants | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);
    await loadConversations();
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convs = await fetchMyConversations(showArchived);
      setConversations(convs);

      if (convs.length > 0 && !selectedConversation) {
        const fullConv = await fetchConversation(convs[0].id);
        if (fullConv) setSelectedConversation(fullConv);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
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

  const handleArchive = async (conversationId: string) => {
    try {
      await archiveConversation(conversationId, true);
      await loadConversations();
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
      alert('Erreur lors de l\'archivage de la conversation');
    }
  };

  const handleLeave = async (conversationId: string) => {
    try {
      await leaveConversation(conversationId);
      await loadConversations();
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Error leaving conversation:', error);
      alert('Erreur lors de la sortie de la conversation');
    }
  };

  useEffect(() => {
    loadConversations();
  }, [showArchived]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <BackButton to="/admin/communication" label="Retour à la Communication" />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 mt-6">
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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
          <div className="grid grid-cols-12 h-full">
            <div className="col-span-4 border-r border-slate-200 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Conversations</h3>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      showArchived
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <Archive className="w-3 h-3" />
                    {showArchived ? 'Actives' : 'Archivées'}
                  </button>
                </div>
              </div>
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id}
                onSelect={handleSelectConversation}
                currentUserId={currentUserId}
                onArchive={handleArchive}
                onLeave={handleLeave}
              />
            </div>

            <div className="col-span-8">
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
