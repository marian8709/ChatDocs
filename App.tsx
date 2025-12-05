
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, MessageSender, URLGroup, LocalDocument, MindMapData, MindMapComplexity, AiModel, CompanyProfile } from './types';
import { generateContentWithUrlContext, getInitialSuggestions, generateMindMapFromContext } from './services/geminiService';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import ChatInterface from './components/ChatInterface';
import MindMapModal from './components/MindMapModal';
import CompanySetupModal from './components/CompanySetupModal';

const FISCAL_URLS = [
  "https://static.anaf.ro/static/10/Anaf/legislatie/Codul_fiscal_norme_2023.htm",
  "https://mfinante.gov.ro/ro/web/site",
  "https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/servicii_oferite_contribuabililor/ghiduri_curente",
];

const PROCEDURI_CONTABILE_URLS = [
  "https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declararea_obligatiilor_fiscale/toate_formularele_cu_explicatii",
  "https://www.inspectiamuncii.ro/",
];

const INITIAL_URL_GROUPS: URLGroup[] = [
  { id: 'legislatie', name: 'Legislație Fiscală (RO)', urls: FISCAL_URLS },
  { id: 'proceduri', name: 'Proceduri & Formulare', urls: PROCEDURI_CONTABILE_URLS },
];

const App: React.FC = () => {
  const [urlGroups, setUrlGroups] = useState<URLGroup[]>(INITIAL_URL_GROUPS);
  const [activeUrlGroupId, setActiveUrlGroupId] = useState<string>(INITIAL_URL_GROUPS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Multi-Company State
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(null); // For modal

  const [localDocuments, setLocalDocuments] = useState<LocalDocument[]>([]);
  const [selectedModel, setSelectedModel] = useState<AiModel>('gemini-2.5-flash');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [initialQuerySuggestions, setInitialQuerySuggestions] = useState<string[]>([]);
  
  const [isMindMapOpen, setIsMindMapOpen] = useState(false);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);

  const MAX_URLS = 20;

  // Derived state
  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;
  const activeDocuments = localDocuments.filter(doc => doc.companyId === activeCompanyId);
  
  const activeGroup = urlGroups.find(group => group.id === activeUrlGroupId);
  const currentUrlsForChat = activeGroup ? activeGroup.urls : [];

  // Init - Check for companies or prompt user
  useEffect(() => {
    // In a real app, load from localStorage here
    if (companies.length === 0) {
      const timer = setTimeout(() => {
        setEditingCompany(null); // Ensure it's new mode
        setIsCompanyModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [companies.length]);

  const handleSaveCompany = (companyData: Partial<CompanyProfile>) => {
    let newActiveId = activeCompanyId;
    
    if (editingCompany && companies.find(c => c.id === editingCompany.id)) {
      // Edit existing
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...companyData } as CompanyProfile : c));
      newActiveId = editingCompany.id;
    } else {
      // Create new
      const newCompany: CompanyProfile = {
        id: `company-${Date.now()}`,
        name: companyData.name!,
        cui: companyData.cui!,
        regCom: companyData.regCom,
        activity: companyData.activity,
        foundedYear: companyData.foundedYear
      };
      setCompanies(prev => [...prev, newCompany]);
      newActiveId = newCompany.id;
      
      // Welcome message for new company
      setChatMessages([{
        id: `welcome-${Date.now()}`,
        text: `Dosar nou creat pentru **${newCompany.name}** (${newCompany.cui}).\n\nPoți începe să încarci documente specifice acestei firme.`,
        sender: MessageSender.SYSTEM,
        timestamp: new Date(),
      }]);
    }

    setActiveCompanyId(newActiveId);
    setIsCompanyModalOpen(false);
    setEditingCompany(null);
  };

  const handleSwitchCompany = (companyId: string) => {
    if (companyId === activeCompanyId) return;
    setActiveCompanyId(companyId);
    const targetCompany = companies.find(c => c.id === companyId);
    
    // Reset chat on switch context
    setChatMessages([{
      id: `switch-${Date.now()}`,
      text: `Am comutat pe dosarul firmei **${targetCompany?.name}**.`,
      sender: MessageSender.SYSTEM,
      timestamp: new Date(),
    }]);
    setIsSidebarOpen(false); 
  };

  const handleAddNewCompany = () => {
    setEditingCompany(null);
    setIsCompanyModalOpen(true);
  };

  const fetchAndSetInitialSuggestions = useCallback(async (currentUrls: string[]) => {
    if (currentUrls.length === 0) {
      setInitialQuerySuggestions([]);
      return;
    }
    setIsFetchingSuggestions(true);
    setInitialQuerySuggestions([]); 

    try {
      const response = await getInitialSuggestions(currentUrls, 'gemini-2.5-flash'); 
      let suggestionsArray: string[] = [];
      if (response.text) {
        try {
          let jsonStr = response.text.trim();
          const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
          const match = jsonStr.match(fenceRegex);
          if (match && match[2]) jsonStr = match[2].trim();
          
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
    }
  }, [currentUrlsForChat, fetchAndSetInitialSuggestions]); 

  const handleAddUrl = (url: string) => {
    setUrlGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === activeUrlGroupId && group.urls.length < MAX_URLS && !group.urls.includes(url)) {
            return { ...group, urls: [...group.urls, url] };
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
    if (!activeCompanyId) {
      alert("Selectează o firmă mai întâi!");
      return;
    }
    // Attach current company ID
    const docWithCompany = { ...doc, companyId: activeCompanyId };
    setLocalDocuments(prev => [...prev, docWithCompany]);
  };

  const handleRemoveDocument = (id: string) => setLocalDocuments(prev => prev.filter(doc => doc.id !== id));

  const handleGenerateMindMap = async (complexity: MindMapComplexity) => {
    if ((currentUrlsForChat.length === 0 && activeDocuments.length === 0) || isGeneratingMindMap) return;

    setIsGeneratingMindMap(true);
    try {
      const data = await generateMindMapFromContext(currentUrlsForChat, activeDocuments, complexity, selectedModel);
      setMindMapData(data);
      setIsMindMapOpen(true);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (e: any) {
      alert(e.message || "Eșec la generarea hărții mentale.");
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isLoading || isFetchingSuggestions) return;
    if (!process.env.API_KEY) {
       setChatMessages(prev => [...prev, {
        id: `error-apikey-${Date.now()}`,
        text: 'EROARE: API Key nu este configurat.',
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
      text: 'Procesez datele contabile...', 
      sender: MessageSender.MODEL,
      timestamp: new Date(),
      isLoading: true,
    };

    setChatMessages(prev => [...prev, userMessage, modelPlaceholderMessage]);

    try {
      // Pass active company documents only
      const response = await generateContentWithUrlContext(query, currentUrlsForChat, activeDocuments, activeCompany, selectedModel);
      setChatMessages(prev =>
        prev.map(msg =>
          msg.id === modelPlaceholderMessage.id
            ? { ...modelPlaceholderMessage, text: response.text || "Nu am primit un răspuns valid.", isLoading: false, urlContext: response.urlContextMetadata }
            : msg
        )
      );
    } catch (e: any) {
      setChatMessages(prev =>
        prev.map(msg =>
          msg.id === modelPlaceholderMessage.id
            ? { ...modelPlaceholderMessage, text: `Eroare: ${e.message}`, sender: MessageSender.SYSTEM, isLoading: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const chatPlaceholder = activeCompany
    ? `Întreabă despre ${activeCompany.name}...`
    : "Configurează o firmă pentru a începe.";

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex relative">
      
      <CompanySetupModal 
        isOpen={isCompanyModalOpen} 
        onSave={handleSaveCompany} 
        initialData={editingCompany}
        isNew={!editingCompany}
        onCancel={() => {
          if (companies.length > 0) setIsCompanyModalOpen(false);
        }}
      />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-[#09090b]/95 backdrop-blur border-r border-white/5 shadow-2xl transition-transform duration-300 ease-out md:static md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <KnowledgeBaseManager
          // Company Props
          companies={companies}
          activeCompanyId={activeCompanyId}
          onSwitchCompany={handleSwitchCompany}
          onAddCompany={handleAddNewCompany}
          onEditCompany={(c) => { setEditingCompany(c); setIsCompanyModalOpen(true); }}
          
          urls={currentUrlsForChat}
          onAddUrl={handleAddUrl}
          onRemoveUrl={handleRemoveUrl}
          maxUrls={MAX_URLS}
          urlGroups={urlGroups}
          activeUrlGroupId={activeUrlGroupId}
          onSetGroupId={setActiveUrlGroupId}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          documents={activeDocuments} // Only show docs for active company
          onAddDocument={handleAddDocument}
          onRemoveDocument={handleRemoveDocument}
          onGenerateMindMap={handleGenerateMindMap}
          isGeneratingMindMap={isGeneratingMindMap}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
      </aside>

      <main className="flex-1 flex flex-col h-full relative z-0">
        <ChatInterface
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholderText={chatPlaceholder}
          initialQuerySuggestions={initialQuerySuggestions}
          onSuggestedQueryClick={handleSendMessage}
          isFetchingSuggestions={isFetchingSuggestions}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          activeCompanyName={activeCompany?.name}
        />
      </main>

      <MindMapModal 
        isOpen={isMindMapOpen} 
        onClose={() => setIsMindMapOpen(false)} 
        data={mindMapData} 
      />
    </div>
  );
};

export default App;
