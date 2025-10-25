import { useState } from "react";
import { X, ExternalLink, Send } from "lucide-react";
import { useChatStore } from "./chatStore";

export default function ChatWindow() {
  const { isOpen, close } = useChatStore();
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessage("");
  };

  return (
    <div className="fixed bottom-24 right-6 z-[100] w-[360px] max-w-[92vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-blue-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <h4 className="font-semibold text-slate-900">Tchat en direct</h4>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/communication/tchat"
            className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-white/50"
            aria-label="Ouvrir en plein écran"
            title="Ouvrir en plein écran"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          <button
            onClick={close}
            aria-label="Fermer"
            className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-white/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-white border border-slate-200 text-slate-800 shadow-sm">
          <p className="text-sm">Bonjour 👋 Comment puis-je vous aider ?</p>
          <span className="text-xs text-slate-500 mt-1 block">10:30</span>
        </div>

        <div className="ml-auto max-w-[80%] rounded-2xl px-4 py-2 bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-sm">
          <p className="text-sm">Je souhaite planifier une intervention.</p>
          <span className="text-xs text-sky-100 mt-1 block text-right">10:32</span>
        </div>

        <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-white border border-slate-200 text-slate-800 shadow-sm">
          <p className="text-sm">Parfait ! Je consulte votre planning...</p>
          <span className="text-xs text-slate-500 mt-1 block">10:33</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white">
        <input
          type="text"
          placeholder="Écrire un message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="rounded-xl h-10 w-10 flex items-center justify-center bg-sky-600 text-white hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
          aria-label="Envoyer le message"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in-95 {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out, zoom-in-95 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
