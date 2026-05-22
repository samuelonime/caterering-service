import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const bookingParam = params.get('booking');
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState(bookingParam || '');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/messages').then(r => setConversations(r.data));
  }, []);

  useEffect(() => {
    if (activeBooking) {
      api.get(`/messages/${activeBooking}`).then(r => setMessages(r.data));
    }
  }, [activeBooking]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeBooking) return;
    try {
      const res = await api.post(`/messages/${activeBooking}`, { message: newMsg });
      setMessages(prev => [...prev, res.data]);
      setNewMsg('');
    } catch { alert('Failed to send'); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
      {/* Conversation List */}
      <div className="lg:w-72 bg-white rounded-xl shadow-sm border overflow-hidden flex-shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
        </div>
        <div className="overflow-y-auto h-full">
          {conversations.map(c => (
            <button key={c.id} onClick={() => setActiveBooking(c.id)} className={`w-full text-left p-3 border-b hover:bg-gray-50 transition-colors ${activeBooking === c.id ? 'bg-primary-50' : ''}`}>
              <p className="text-sm font-medium text-gray-900 truncate">{c.client_name || c.event_type}</p>
              <p className="text-xs text-gray-500 truncate">{c.event_type.replace('_', ' ')}</p>
              {c.unread_count > 0 && <span className="inline-block bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full mt-1">{c.unread_count} new</span>}
            </button>
          ))}
          {conversations.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No conversations yet</p>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
        {activeBooking ? (
          <>
            <div className="p-4 border-b bg-gray-50">
              <p className="font-medium text-gray-900">
                {conversations.find(c => c.id === activeBooking)?.event_type?.replace('_', ' ') || 'Chat'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${m.sender_id === user?.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="text-xs font-medium mb-1 opacity-70">{m.sender_name}</p>
                    <p className="text-sm">{m.message}</p>
                    <p className="text-xs mt-1 opacity-50">{new Date(m.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." rows={1} className="flex-1 px-4 py-2.5 border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 outline-none" />
                <button onClick={sendMessage} disabled={!newMsg.trim()} className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">Send</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
