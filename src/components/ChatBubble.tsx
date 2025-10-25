import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ChatBubble() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(3);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    if (hasNewMessage) {
      const timer = setTimeout(() => setHasNewMessage(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasNewMessage]);

  const handleClick = () => {
    navigate('/admin/communication/tchat');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleClick}
        className={`
          relative w-16 h-16 rounded-full
          bg-gradient-to-br from-blue-100 to-blue-200
          border-2 border-blue-300/50
          shadow-lg hover:shadow-xl
          hover:from-blue-200 hover:to-blue-300
          transition-all duration-300 ease-out
          flex items-center justify-center
          group
          ${hasNewMessage ? 'animate-bounce' : ''}
        `}
        aria-label="Ouvrir le tchat"
      >
        <MessageCircle className="w-7 h-7 text-blue-600 group-hover:text-blue-700 transition-colors" />

        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-scale-in">
            <span className="text-white text-xs font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}

        <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
      </button>

      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  );
}
