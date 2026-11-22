import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Phone } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { ChatMessage } from '../shared/types';

interface LiveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  currentUser: { id: string; fullName: string; role?: string };
  recipientName: string;
  recipientPhone?: string;
  socket: Socket | null;
  apiBaseUrl: string;
}

export const LiveChatModal: React.FC<LiveChatModalProps> = ({
  isOpen,
  onClose,
  rideId,
  currentUser,
  recipientName,
  recipientPhone,
  socket,
  apiBaseUrl
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getAuthToken = () => {
    return localStorage.getItem('pakride_token') || `mock-token-${currentUser.id}`;
  };

  // Fetch initial chat history
  useEffect(() => {
    if (!isOpen || !rideId) return;

    fetch(`${apiBaseUrl}/api/rides/${rideId}/chat`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages);
      })
      .catch((err) => console.error('Fetch chat error:', err));
  }, [isOpen, rideId]);

  // Listen for real-time incoming messages via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handler = (data: { rideId: string; message: ChatMessage }) => {
      if (data.rideId === rideId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    };

    socket.on('ride_chat_message', handler);
    return () => {
      socket.off('ride_chat_message', handler);
    };
  }, [socket, rideId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/rides/${rideId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ text: textToSend })
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Send chat error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full h-[520px] flex flex-col shadow-2xl relative overflow-hidden border border-slate-200">
        {/* Chat Header */}
        <div className="bg-charcoal-900 text-white p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-pakgreen-500 flex items-center justify-center font-bold text-xs">
              {recipientName.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">{recipientName}</div>
              <div className="text-[10px] text-pakgreen-400">Live Trip Chat</div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {recipientPhone && (
              <a
                href={`tel:${recipientPhone}`}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-charcoal-800 transition"
              >
                <Phone className="w-4 h-4 text-pakgreen-400" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-charcoal-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-50">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No messages yet.</p>
              <p className="text-[10px] mt-0.5">Send a quick note regarding your pickup location.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === currentUser.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                      isMine
                        ? 'bg-pakgreen-500 text-white rounded-br-xs'
                        : 'bg-white text-charcoal-900 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pakgreen-500 outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-pakgreen-500 hover:bg-pakgreen-600 text-white rounded-xl disabled:opacity-50 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
