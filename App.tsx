/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, MessageSender, URLGroup, LocalDocument, MindMapData, MindMapComplexity } from './types';
import { generateContentWithUrlContext, getInitialSuggestions, generateMindMapFromContext } from './services/geminiService';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import ChatInterface from './components/ChatInterface';
import MindMapModal from './components/MindMapModal';

const GEMINI_DOCS_URLS = [
  "https://ai.google.dev/gemini-api/docs",
  "https://ai.google.dev/gemini-api/docs/quickstart",
  "https://ai.google.dev/gemini-api/docs/api-key",
  "https://ai.google.dev/gemini-api/docs/libraries",
  "https://ai.google.dev/gemini-api/docs/models",
  "https://ai.google.dev/gemini-api/docs/pricing",
  "https://ai.google.dev/gemini-api/docs/rate-limits",
  "https://ai.google.dev/gemini-api/docs/billing",
  "https://ai.google.dev/gemini-api/docs/changelog",
];

const MODEL_CAPABILITIES_URLS = [
  "https://ai.google.dev/gemini-api/docs/text-generation",
  "https://ai.google.dev/gemini-api/docs/image-generation",
  "https://ai.google.dev/gemini-api/docs/video",
  "https://ai.google.dev/gemini-api/docs/speech-generation",
  "https://ai.google.dev/gemini-api/docs/music-generation",
  "https://ai.google.dev/gemini-api/docs/long-context",
  "https://ai.google.dev/gemini-api/docs/structured-output",
  "https://ai.google.dev/gemini-api/docs/thinking",
  "https://ai.google.dev/gemini-api/docs/function-calling",
  "https://ai.google.dev/gemini-api/docs/document-processing",
  "https://ai.google.dev/gemini-api/docs/image-understanding",
  "https://ai.google.dev/gemini-api/docs/video-understanding",
  "https://ai.google.dev/gemini-api/docs/audio",
  "https://ai.google.dev/gemini-api/docs/code-execution",
  "https://ai.google.dev/gemini-api/docs/grounding",
];

const INITIAL_URL_GROUPS: URLGroup[] = [
  { id: 'gemini-overview', name: 'Gemini Docs Overview', urls: GEMINI_DOCS_URLS },
  { id: 'model-capabilities', name: 'Model Capabilities', urls: MODEL_CAPABILITIES_URLS },
];

const App: React.FC = () => {
  const [urlGroups, setUrlGroups] = useState<URLGroup[]>(INITIAL_URL_GROUPS);
  const [activeUrlGroupId, setActiveUrlGroupId] = useState<string>(INITIAL_URL_GROUPS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [localDocuments, setLocalDocuments] = useState<LocalDocument[]>([]);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [initialQuerySuggestions, setInitialQuerySuggestions] = useState<string[]>([]);
  
  // Mind Map State
  const [isMindMapOpen, setIsMindMapOpen] = useState(false);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);

  const MAX_URLS = 20;

  const activeGroup = urlGroups.find(group => group.id === activeUrlGroupId);
  const currentUrlsForChat = activeGroup ? activeGroup.urls : [];

   useEffect(() => {
    const apiKey = process.env.API_KEY;
    const currentActiveGroup = urlGroups.find(group => group.id === activeUrlGroupId);
    const welcomeMessageText = !apiKey 
        ? 'ERROR: Gemini API Key (process.env.API_KEY) is not configured.'
        : `Welcome! I'm ready to help you with **${currentActiveGroup?.name || 'your documents'}**. \n\nI can read the URLs on the left or any document you upload.`;
    
    setChatMessages([{
      id: `system-welcome-${activeUrlGroupId}-${Date.now()}`,
      text: welcomeMessageText,
      sender: MessageSender.SYSTEM,
      timestamp: new Date(),
    }]);
  }, [activeUrlGroupId, urlGroups]); 


  const fetchAndSetInitialSuggestions = useCallback(async (currentUrls: string[]) => {
    if (currentUrls.length === 0) {
      setInitialQuerySuggestions([]);
      return;
    }
      
    setIsFetchingSuggestions(true);
    setInitialQuerySuggestions([]); 

    try {
      const response = await getInitialSuggestions(currentUrls); 
      let suggestionsArray: string[] = [];
      if (response.text) {
        try {
          let jsonStr = response.text.trim();
          const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
          const match = jsonStr.match(fenceRegex);
          if (match && match[2]) {
            jsonStr = match[2].trim();
          }
          const parsed = JSON.parse(jsonStr);
          if (parsed && Array.isArray(parsed.suggestions)) {
            suggestionsArray = parsed.suggestions.filter((s: unknown) => typeof s === 'string');
          }
        } catch (parseError) {
          console.error("Failed to parse suggestions JSON:", parseError);
        }
      }
      setInitialQuerySuggestions(suggestionsArray.slice(0, 4)); 
    } catch (e: any) {
      console.warn("Error fetching suggestions:", e);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, []); 

  useEffect(() => {
    if (currentUrlsForChat.length > 0 && process.env.API_KEY) { 
        fetchAndSetInitialSuggestions(currentUrlsForChat);
    } else {
        setInitialQuerySuggestions([]); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrlsForChat, fetchAndSetInitialSuggestions]); 


  const handleAddUrl = (url: string) => {
    setUrlGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === activeUrlGroupId) {
          if (group.urls.length < MAX_URLS && !group.urls.includes(url)) {
            return { ...group, urls: [...group.urls, url] };
          }
        }
        return group;
      })
    );
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    setUrlGroups(prevGroups =>
      prevGroups.map(group => {
        if (group.id === activeUrlGroupId) {
          return { ...group, urls: group.urls.filter(url => url !== urlToRemove) };
        }
        return group;
      })
    );
  };

  const handleAddDocument = (doc: LocalDocument) => {
    setLocalDocuments(prev => [...prev, doc]);
  };

  const handleRemoveDocument = (id: string) => {
    setLocalDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleGenerateMindMap = async (complexity: MindMapComplexity) => {
    if ((currentUrlsForChat.length === 0 && localDocuments.length === 0) || isGeneratingMindMap) return;

    setIsGeneratingMindMap(true);
    try {
      const data = await generateMindMapFromContext(currentUrlsForChat, localDocuments, complexity);
      setMindMapData(data);
      setIsMindMapOpen(true);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false); // Close sidebar on mobile when opening map
      }
    } catch (e: any) {
      console.error("Failed to generate mind map", e);
      // Show cleaner message to user
      alert(e.message || "Failed to generate mind map. Please try again.");
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isLoading || isFetchingSuggestions) return;

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
       setChatMessages(prev => [...prev, {
        id: `error-apikey-${Date.now()}`,
        text: 'ERROR: API Key is not configured.',
        sender: MessageSender.SYSTEM,
        timestamp: new Date(),
      }]);
      return;
    }
    
    setIsLoading(true);
    setInitialQuerySuggestions([]); 

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: query,
      sender: MessageSender.USER,
      timestamp: new Date(),
    };
    
    const modelPlaceholderMessage: ChatMessage = {
      id: `model-response-${Date.now()}`,
      text: 'Thinking...', 
      sender: MessageSender.MODEL,
      timestamp: new Date(),
      isLoading: true,
    };

    setChatMessages(prevMessages => [...prevMessages, userMessage, modelPlaceholderMessage]);

    try {
      const response = await generateContentWithUrlContext(query, currentUrlsForChat, localDocuments);
      setChatMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === modelPlaceholderMessage.id
            ? { ...modelPlaceholderMessage, text: response.text || "I received an empty response.", isLoading: false, urlContext: response.urlContextMetadata }
            : msg
        )
      );
    } catch (e: any) {
      const errorMessage = e.message || 'Failed to get response from AI.';
      setChatMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === modelPlaceholderMessage.id
            ? { ...modelPlaceholderMessage, text: `Error: ${errorMessage}`, sender: MessageSender.SYSTEM, isLoading: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQueryClick = (query: string) => {
    handleSendMessage(query);
  };
  
  const hasContext = currentUrlsForChat.length > 0 || localDocuments.length > 0;
  
  const chatPlaceholder = hasContext
    ? `Ask anything about the ${activeGroup?.name} content...`
    : "Select a group, add URLs, or upload documents to start.";

  return (
    <div className="h-screen max-h-screen antialiased relative overflow-hidden bg-[#09090b] text-neutral-200 selection:bg-blue-500/30">
      
      {/* Subtle Background Gradient */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <div className="flex h-full w-full relative z-10">
        {/* Sidebar */}
        <aside className={`
          fixed top-0 left-0 h-full w-80 z-40 transform transition-transform cubic-bezier(0.16, 1, 0.3, 1) duration-300
          border-r border-white/5 bg-[#09090b]/95 backdrop-blur-xl md:static md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
          <KnowledgeBaseManager
            urls={currentUrlsForChat}
            onAddUrl={handleAddUrl}
            onRemoveUrl={handleRemoveUrl}
            maxUrls={MAX_URLS}
            urlGroups={urlGroups}
            activeUrlGroupId={activeUrlGroupId}
            onSetGroupId={setActiveUrlGroupId}
            onCloseSidebar={() => setIsSidebarOpen(false)}
            documents={localDocuments}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            onGenerateMindMap={handleGenerateMindMap}
            isGeneratingMindMap={isGeneratingMindMap}
          />
        </aside>

        {/* Chat Interface */}
        <main className="flex-1 h-full min-w-0 bg-gradient-to-b from-transparent to-black/20">
          <ChatInterface
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholderText={chatPlaceholder}
            initialQuerySuggestions={initialQuerySuggestions}
            onSuggestedQueryClick={handleSuggestedQueryClick}
            isFetchingSuggestions={isFetchingSuggestions}
            onToggleSidebar={() => setIsSidebarOpen(true)}
          />
        </main>
      </div>

      {/* Mind Map Modal */}
      <MindMapModal 
        isOpen={isMindMapOpen} 
        onClose={() => setIsMindMapOpen(false)} 
        data={mindMapData} 
      />
    </div>
  );
};

export default App;
