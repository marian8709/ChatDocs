
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { ChatMessage, MessageSender } from '../types';
import { User, Bot, Sparkles, Link as LinkIcon, AlertCircle } from 'lucide-react';

// Configure marked
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

const SenderAvatar: React.FC<{ sender: MessageSender }> = ({ sender }) => {
  if (sender === MessageSender.USER) {
    return (
      <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 shadow-sm mt-1">
        <User size={14} />
      </div>
    );
  } else if (sender === MessageSender.MODEL) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/20 mt-1">
        <Bot size={16} />
      </div>
    );
  } else { // SYSTEM
    return (
      <div className="w-8 h-8 rounded-full bg-red-900/30 border border-red-500/20 flex items-center justify-center text-red-400 mt-1">
        <AlertCircle size={16} />
      </div>
    );
  }
};

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.sender === MessageSender.USER;
  const isModel = message.sender === MessageSender.MODEL;
  const isSystem = message.sender === MessageSender.SYSTEM;

  const renderContent = () => {
    if (isModel && !message.isLoading) {
      const rawMarkup = marked.parse(message.text || "") as string;
      return <div className="prose prose-sm prose-invert max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: rawMarkup }} />;
    }
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</div>;
  };
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
      <div className={`flex gap-3 max-w-[85%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0">
            <SenderAvatar sender={message.sender} />
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`
                relative px-5 py-3.5 shadow-md
                ${isUser 
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                    : isSystem 
                        ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl'
                        : 'bg-neutral-800/80 border border-white/5 text-neutral-100 rounded-2xl rounded-tl-sm backdrop-blur-sm'
                }
            `}>
                {message.isLoading ? (
                    <div className="flex items-center gap-1.5 h-6">
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-75"></div>
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-75 [animation-delay:0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-75 [animation-delay:0.3s]"></div>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>

            {/* Citations / Context Metadata */}
            {isModel && message.urlContext && message.urlContext.length > 0 && (
                <div className="mt-2 ml-1 p-3 bg-neutral-900/50 border border-white/5 rounded-xl w-full max-w-md">
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        <LinkIcon size={12} />
                        <span>Sources Referenced</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                        {message.urlContext.map((meta, idx) => (
                            <a 
                                key={idx} 
                                href={meta.retrievedUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors text-xs text-blue-400 group/link"
                            >
                                <span className="truncate flex-1 font-medium">{meta.retrievedUrl}</span>
                                <span className="text-[10px] text-neutral-600 group-hover/link:text-neutral-500 ml-2">
                                    {meta.urlRetrievalStatus.includes('SUCCESS') ? 'Verified' : 'Checking'}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Timestamp (Optional, on hover) */}
            <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-neutral-600 px-1">
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
