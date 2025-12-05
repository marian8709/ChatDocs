
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageSender } from '../types'; 
import MessageItem from './MessageItem';
import { Send, Menu, MessageSquare, Calculator, Sparkles, Command, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isLoading: boolean;
  placeholderText?: string;
  initialQuerySuggestions?: string[];
  onSuggestedQueryClick?: (query: string) => void;
  isFetchingSuggestions?: boolean;
  onToggleSidebar?: () => void;
  activeCompanyName?: string;
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
  activeCompanyName,
}) => {
  const [userQuery, setUserQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [userQuery]);

  const handleSend = () => {
    if (userQuery.trim() && !isLoading) {
      onSendMessage(userQuery.trim());
      setUserQuery('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const showSuggestions = initialQuerySuggestions && initialQuerySuggestions.length > 0 && messages.filter(m => m.sender !== MessageSender.SYSTEM).length <= 1;

  return (
    <div className="flex flex-col h-full w-full relative bg-transparent">
      
      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-20 h-16 flex items-center justify-between px-6 bg-transparent">
        <div className="flex items-center gap-4">
           {onToggleSidebar && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onToggleSidebar}
              className="md:hidden text-zinc-400 hover:text-white -ml-2"
            >
              <Menu size={20} />
            </Button>
          )}
          <div className="hidden md:flex items-center gap-2 text-sm text-zinc-400 animate-fade-in">
             <span className="font-semibold text-zinc-300">Asistent Fiscal</span>
             <span className="text-zinc-600">/</span>
             <span className="truncate max-w-[200px] text-blue-400">
               {activeCompanyName || "Selectează Firmă"}
             </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-medium text-emerald-400 tracking-wide uppercase">Sistem Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow pt-20 pb-4 overflow-y-auto px-4 md:px-0 scroll-smooth">
        <div className="max-w-3xl mx-auto w-full pb-4">
          
          {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in-scale px-4">
               <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-900/50 ring-1 ring-white/10">
                 <Calculator size={36} className="text-white" />
               </div>
               <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center tracking-tight">Expert Contabil Digital</h1>
               <p className="text-zinc-400 text-center max-w-md mb-8 leading-relaxed">
                 Sunt pregătit să analizez legislația, să interpretez balanțe și să răspund la întrebări complexe despre fiscalitate.
               </p>
               
               {isFetchingSuggestions ? (
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                     <Loader2 size={16} className="animate-spin" />
                     <span>Generez sugestii relevante...</span>
                  </div>
               ) : (
                 showSuggestions && onSuggestedQueryClick && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                      {initialQuerySuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => onSuggestedQueryClick(suggestion)}
                          className="group interactive-card text-left p-4 rounded-xl relative overflow-hidden"
                        >
                          <div className="absolute top-4 right-4 text-zinc-700 group-hover:text-blue-500 transition-colors">
                            <ArrowRight size={16} />
                          </div>
                          <h4 className="text-zinc-200 font-medium text-sm mb-1 pr-6">{suggestion}</h4>
                          <p className="text-zinc-500 text-xs">Întreabă acum</p>
                        </button>
                      ))}
                    </div>
                 )
               )}
             </div>
          )}
          
          <div className="space-y-8 px-2 md:px-0">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
          </div>
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-transparent">
        <div className="max-w-3xl mx-auto relative">
            <div className={`
              relative flex items-end gap-2 p-3 rounded-2xl border transition-all shadow-xl backdrop-blur-xl
              ${isLoading ? 'bg-zinc-900/40 border-white/5 opacity-80' : 'glass-panel hover:border-white/20 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20'}
            `}>
            
            <div className="pl-2 pb-2 text-zinc-500">
               <Command size={18} />
            </div>

            <textarea
                ref={textareaRef}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={placeholderText || "Scrie o întrebare despre contabilitate..."}
                className="w-full bg-transparent text-sm md:text-base placeholder:text-zinc-500 text-zinc-200 border-none focus:ring-0 resize-none py-2 px-2 max-h-40 min-h-[24px] leading-relaxed scrollbar-hide"
                rows={1}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                  }
                }}
            />
            
            <Button
                size="icon"
                onClick={handleSend}
                disabled={isLoading || !userQuery.trim()}
                className={`
                   mb-0.5 rounded-xl h-10 w-10 transition-all duration-300
                  ${!userQuery.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'}
                `}
            >
                {isLoading ? 
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> 
                  : <Send size={18} />
                }
            </Button>
            </div>
            
            <div className="text-[10px] text-center mt-3 text-zinc-600 font-medium tracking-wide">
               Generat cu Gemini AI • Verificați sursele legislative oficiale.
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
