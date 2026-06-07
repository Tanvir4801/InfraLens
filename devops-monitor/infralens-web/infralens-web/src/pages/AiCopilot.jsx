import React, { useState, useEffect, useRef } from 'react';
import { aiChat, fetchMetrics, fetchAlerts, fetchServers } from '../services/api';

export default function AiCopilot() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your InfraLens Copilot. How can I help you manage your infrastructure today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const [m, a, s] = await Promise.all([fetchMetrics(), fetchAlerts(), fetchServers()]);
        setContext({ cpu: m.cpu_percent, ram: m.ram_percent, disk: m.disk_percent, alerts: a, containers: s });
      } catch (err) {
        console.error('Failed to load context', err);
      }
    };
    loadContext();
  }, []);

  const handleSend = async (text) => {
    const userText = text || input;
    if (!userText.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { role: 'user', text: userText, time: timestamp }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await aiChat(userText, context);
      typeWriter(response.answer);
    } catch (err) {
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error processing your request.', time: aiTime }]);
    } finally {
      setLoading(false);
    }
  };

  const typeWriter = (text) => {
    let currentText = '';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setMessages(prev => [...prev, { role: 'ai', text: '', time: timestamp }]);
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        currentText += text.charAt(i);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, text: currentText }];
        });
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);
  };

  const suggestedQuestions = [
    "Why is memory high?",
    "Which container restarted most?",
    "Show unhealthy services",
    "Predict disk usage next hour",
    "What caused the last alert?"
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar - Chat History */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col hidden md:flex">
         <div className="p-4 border-b border-gray-700 font-bold text-blue-400 flex items-center gap-2">
            <span>✦</span> AI History
         </div>
         <div className="flex-1 overflow-auto p-2 space-y-1">
            <div className="p-2 bg-gray-700 rounded text-xs cursor-pointer truncate">Current Session</div>
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
           <h2 className="font-bold flex items-center gap-2">
              <span className="text-blue-500">🤖</span> InfraLens Copilot
           </h2>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${m.role === 'user' ? 'bg-blue-600/20' : 'bg-gray-700/50'}`}>
                {m.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className={`max-w-[75%] group relative ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block rounded-2xl p-4 shadow-xl border ${
                  m.role === 'user' 
                    ? 'bg-blue-900/30 border-blue-500/30 rounded-tr-sm text-white' 
                    : 'bg-gray-800/60 border-gray-600/30 rounded-tl-sm text-gray-100'
                }`}>
                  {m.role === 'ai' && <div className="text-[10px] uppercase font-black text-blue-400 mb-1 tracking-widest">InfraLens AI</div>}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                </div>
                {m.time && (
                  <div className={`text-[9px] text-gray-500 font-bold mt-1 uppercase ${m.role === 'user' ? 'mr-1' : 'ml-1'}`}>
                    {m.time}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start items-start gap-3">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center text-lg animate-bounce">🤖</div>
               <div className="bg-gray-800/60 border border-gray-600/30 rounded-2xl rounded-tl-sm p-4 text-blue-400 flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '400ms' }}>.</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {suggestedQuestions.map(q => (
              <button 
                key={q} 
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-4 py-2 border border-blue-500/40 text-blue-300 hover:bg-blue-900/20 rounded-full text-xs font-bold transition-all"
              >
                {q}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Ask anything about your infrastructure..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-bold transition-colors"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
