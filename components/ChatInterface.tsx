/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageSender } from '../types'; 
import MessageItem from './MessageItem';
import { Send, Menu, Sparkles, MessageSquare } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isLoading: boolean;
  placeholderText?: string;
  initialQuerySuggestions?: string[];
  onSuggestedQueryClick?: (query: string) => void;
  isFetchingSuggestions?: boolean;
  onToggleSidebar?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  placeholderText,
  initialQuerySuggestions,
  onSuggestedQueryClick,
  isFetchingSuggestions,
  onToggleSidebar,
}) => {
  const [userQuery, setUserQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = () => {
    if (userQuery.trim() && !isLoading) {
      onSendMessage(userQuery.trim());
      setUserQuery('');
    }
  };

  // Only show suggestions if it's the start of the chat (mostly)
  const showSuggestions = initialQuerySuggestions && initialQuerySuggestions.length > 0 && messages.filter(m => m.sender !== MessageSender.SYSTEM).length <= 1;

  return (
    <div className="flex flex-col h-full w-full relative">
      
      {/* Header - Glassmorphic */}
      <div className="absolute top-0 left-0 right-0 z-20 h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
           {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="p-2 -ml-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20">
              <Sparkles size={14} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">Expert Contabil AI</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow pt-20 pb-4 overflow-y-auto chat-container px-4 md:px-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-[50vh] opacity-50">
               <MessageSquare size={48} className="text-neutral-700 mb-4" />
               <p className="text-neutral-500">Începe o conversație despre fiscalitate.</p>
             </div>
          )}
          
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
          
          {isFetchingSuggestions && (
              <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 text-neutral-500 bg-neutral-900/50 px-3 py-1.5 rounded-full text-xs border border-white/5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <span>Analizez contextul fiscal...</span>
                  </div>
              </div>
          )}

          {showSuggestions && onSuggestedQueryClick && (
            <div className="my-6 animate-fade-in">
              <p className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wider text-center">Întrebări Sugerate</p>
              <div className="flex flex-wrap justify-center gap-2">
                {initialQuerySuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestedQueryClick(suggestion)}
                    className="bg-neutral-800/50 hover:bg-neutral-700/80 text-blue-200 border border-neutral-700 hover:border-blue-500/30 px-4 py-2 rounded-xl text-sm transition-all shadow-sm active:scale-95"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area - Floating */}
      <div className="p-4 md:p-6 pb-6 pt-2">
        <div className="max-w-3xl mx-auto relative group">
            {/* Glow effect behind input */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            
            <div className="relative flex items-end gap-2 bg-[#18181b] border border-neutral-800 rounded-2xl p-2 shadow-xl shadow-black/20 focus-within:ring-1 focus-within:ring-blue-500/30 focus-within:border-blue-500/30 transition-all">
            <textarea
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={placeholderText || "Scrie un mesaj..."}
                className="w-full max-h-32 min-h-[44px] py-2.5 px-3 bg-transparent text-neutral-200 placeholder-neutral-500 border-none focus:ring-0 resize-none text-sm leading-relaxed scrollbar-hide"
                rows={1}
                disabled={isLoading}
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
                }}
            />
            <button
                onClick={handleSend}
                disabled={isLoading || !userQuery.trim()}
                className="mb-1 p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 transition-all shadow-md flex-shrink-0"
                aria-label="Send"
            >
                {isLoading && messages[messages.length-1]?.sender === MessageSender.MODEL ? 
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> 
                : <Send size={18} />
                }
            </button>
            </div>
            
            <div className="text-[10px] text-center mt-2 text-neutral-600">
                AI-ul poate greși. Verifică întotdeauna informațiile cu un contabil autorizat.
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;