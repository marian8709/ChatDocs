
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { ChatMessage, MessageSender } from '../types';
import { User, Bot, AlertCircle, Link as LinkIcon, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-', 
} as any);

interface MessageItemProps {
  message: ChatMessage;
}

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-4 min-w-[300px] py-2 animate-fade-in">
    <div className="flex items-center gap-3">
       <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
         <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
       </div>
       <span className="text-xs font-semibold text-blue-400 tracking-wide uppercase">Analiză Fiscală în Curs</span>
    </div>
    <div className="space-y-3 pl-7">
      <div className="h-4 w-full bg-white/5 rounded animate-shimmer"></div>
      <div className="h-4 w-[90%] bg-white/5 rounded animate-shimmer delay-75"></div>
      <div className="h-4 w-[75%] bg-white/5 rounded animate-shimmer delay-150"></div>
    </div>
  </div>
);

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.sender === MessageSender.USER;
  const isModel = message.sender === MessageSender.MODEL;
  const isSystem = message.sender === MessageSender.SYSTEM;

  const renderContent = () => {
    if (isModel && message.isLoading) {
      return <LoadingSkeleton />;
    }
    
    if (isModel || isSystem) {
       const rawMarkup = marked.parse(message.text || "") as string;
       return (
         <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
            <div dangerouslySetInnerHTML={{ __html: rawMarkup }} />
         </div>
       );
    }
    
    return <div className="whitespace-pre-wrap text-sm leading-relaxed text-white font-medium">{message.text}</div>;
  };
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-scale group`}>
      <div className={`flex gap-4 max-w-[95%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
             <div className="w-8 h-8 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-zinc-300">
               <User size={14} />
             </div>
          ) : isModel ? (
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/30">
               <Sparkles size={14} />
             </div>
          ) : (
             <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
               <AlertCircle size={14} />
             </div>
          )}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
            <div className={`
                relative px-6 py-4 shadow-sm text-sm border
                ${isUser 
                    ? 'bg-[#2563eb] border-blue-500 text-white rounded-2xl rounded-tr-sm shadow-[0_4px_20px_rgba(37,99,235,0.2)]' 
                    : isSystem 
                        ? 'bg-red-950/20 border-red-900/30 text-red-200 rounded-xl w-full'
                        : 'bg-[#18181b]/60 border-white/5 backdrop-blur-md text-zinc-200 rounded-2xl rounded-tl-sm w-full shadow-xl'
                }
            `}>
                {/* Header for Bot Messages */}
                {isModel && !message.isLoading && (
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      Răspuns Generat
                    </span>
                    <span className="text-[10px] text-zinc-600 ml-auto">
                      {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                )}
                
                {renderContent()}

                {/* Footer Citations for Bot */}
                {isModel && message.urlContext && message.urlContext.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Surse Utilizate</span>
                        <div className="flex flex-wrap gap-2">
                            {message.urlContext.map((meta, idx) => (
                                <a 
                                    key={idx} 
                                    href={meta.retrievedUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all text-[11px] text-blue-300/80 hover:text-blue-300"
                                >
                                    <LinkIcon size={10} />
                                    <span className="truncate max-w-[200px]">
                                      {meta.retrievedUrl.replace(/^https?:\/\/(www\.)?/, '')}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {isUser && (
              <span className="text-[10px] text-zinc-600 mt-2 mr-1">
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
