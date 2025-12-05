
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, X, FileText, Upload, Globe, Briefcase, 
  Network, Archive, PieChart, 
  Building, CreditCard, Receipt, Settings, CheckCircle2,
  Cpu, ChevronRight, FolderOpen, Edit, PlusCircle, Check
} from 'lucide-react';
import { URLGroup, LocalDocument, MindMapComplexity, AiModel, DocumentCategory, CompanyProfile } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

interface KnowledgeBaseManagerProps {
  // Multi-company props
  companies: CompanyProfile[];
  activeCompanyId: string | null;
  onSwitchCompany: (id: string) => void;
  onAddCompany: () => void;
  onEditCompany: (profile: CompanyProfile) => void;

  urls: string[];
  onAddUrl: (url: string) => void;
  onRemoveUrl: (url: string) => void;
  maxUrls?: number;
  urlGroups: URLGroup[];
  activeUrlGroupId: string;
  onSetGroupId: (id: string) => void;
  onCloseSidebar?: () => void;
  documents?: LocalDocument[];
  onAddDocument?: (doc: LocalDocument) => void;
  onRemoveDocument?: (id: string) => void;
  onGenerateMindMap?: (complexity: MindMapComplexity) => void;
  isGeneratingMindMap?: boolean;
  selectedModel?: AiModel;
  onSelectModel?: (model: AiModel) => void;
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ 
  companies,
  activeCompanyId,
  onSwitchCompany,
  onAddCompany,
  onEditCompany,

  urls, 
  onAddUrl, 
  onRemoveUrl, 
  maxUrls = 20,
  urlGroups,
  activeUrlGroupId,
  onSetGroupId,
  onCloseSidebar,
  documents = [],
  onAddDocument,
  onRemoveDocument,
  onGenerateMindMap,
  isGeneratingMindMap = false,
  selectedModel = 'gemini-2.5-flash',
  onSelectModel,
}) => {
  const [currentUrlInput, setCurrentUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'docs' | 'resources' | 'settings'>('docs');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('invoice_in');
  const [error, setError] = useState<string | null>(null);
  const [complexity, setComplexity] = useState<MindMapComplexity>('moderate');
  
  // Accordion state for categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'invoice_in': true,
    'invoice_out': true,
    'bank_statement': true,
    'contract': false,
    'fiscal_doc': false,
    'general': false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}));
  };

  const validateUrl = (urlString: string): string | null => {
    const trimmed = urlString.trim();
    if (!trimmed) return 'URL invalid.';
    if (!/^https?:\/\//i.test(trimmed)) return 'Lipsește http/https.';
    return null;
  };

  const handleAddUrl = () => {
    const validationError = validateUrl(currentUrlInput);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (urls.length >= maxUrls) {
      setError(`Maxim ${maxUrls} link-uri.`);
      return;
    }
    onAddUrl(currentUrlInput);
    setCurrentUrlInput('');
    setError(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeCompanyId) {
      setError("Selectează o firmă pentru a încărca documente.");
      return;
    }
    const file = event.target.files?.[0];
    if (!file || !onAddDocument) return;
    if (file.size > 10 * 1024 * 1024) { 
      setError('Fișier prea mare (>10MB).');
      return;
    }
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const newDoc: LocalDocument = {
        id: `doc-${Date.now()}`,
        companyId: activeCompanyId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data: base64Data,
        category: uploadCategory,
        timestamp: Date.now()
      };

      onAddDocument(newDoc);
      // Auto expand the category where file was added
      setExpandedCategories(prev => ({...prev, [uploadCategory]: true}));
      setError(null);
    } catch (e) {
      setError('Eroare la procesare fișier.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getDocsByCategory = (cat: DocumentCategory) => documents.filter(d => d.category === cat);
  
  const categoryConfig: Record<DocumentCategory, {label: string, icon: React.ReactNode, color: string}> = {
    'invoice_in': { label: 'Facturi Intrare', icon: <Receipt size={14} />, color: 'text-emerald-400' },
    'invoice_out': { label: 'Facturi Ieșire', icon: <FileText size={14} />, color: 'text-orange-400' },
    'bank_statement': { label: 'Extrase Bancare', icon: <CreditCard size={14} />, color: 'text-blue-400' },
    'contract': { label: 'Contracte', icon: <Briefcase size={14} />, color: 'text-purple-400' },
    'fiscal_doc': { label: 'Declarații ANAF', icon: <Building size={14} />, color: 'text-red-400' },
    'general': { label: 'Diverse', icon: <Archive size={14} />, color: 'text-zinc-400' },
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-sm font-sans border-r border-white/5 shadow-2xl">
      
      {/* 1. Compact Header */}
      <div className="p-4 bg-zinc-900/40 border-b border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2.5">
             <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
               <PieChart size={14} />
             </div>
             <span className="font-bold text-zinc-100 text-sm tracking-tight">Contab AI</span>
           </div>
           {onCloseSidebar && (
             <Button variant="ghost" size="icon" onClick={onCloseSidebar} className="md:hidden h-6 w-6">
               <X size={14} />
             </Button>
           )}
        </div>

        {/* Active Company Banner */}
        <div className="flex items-center justify-between bg-zinc-900 border border-white/10 rounded-lg p-2.5 group hover:border-blue-500/30 transition-colors cursor-pointer" onClick={() => setActiveTab('settings')}>
           <div className="flex items-center gap-2 overflow-hidden">
             <div className="p-1 bg-white/5 rounded text-zinc-400">
                <Building size={12} />
             </div>
             <div className="flex flex-col">
               <span className="text-xs font-semibold text-zinc-200 truncate max-w-[140px]">
                 {activeCompany ? activeCompany.name : 'Selectare Firmă'}
               </span>
               <span className="text-[10px] text-zinc-500 truncate">
                 {activeCompany ? `CUI: ${activeCompany.cui}` : 'Nedefinit'}
               </span>
             </div>
           </div>
           <Settings size={12} className="text-zinc-600 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
      
      {/* 2. Modern Segmented Navigation */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex p-1 bg-zinc-900/80 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('docs')}
            className={`flex-1 flex items-center justify-center py-1.5 text-[11px] font-medium rounded-md transition-all ${activeTab === 'docs' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Dosar
          </button>
          <button 
            onClick={() => setActiveTab('resources')}
            className={`flex-1 flex items-center justify-center py-1.5 text-[11px] font-medium rounded-md transition-all ${activeTab === 'resources' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Surse
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center py-1.5 text-[11px] font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Firme
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide space-y-6">
        
        {/* --- TAB 1: DOSAR (Documents) --- */}
        {activeTab === 'docs' && (
          <>
            {activeCompany ? (
              <>
                {/* Action Card */}
                <div className="p-3 bg-zinc-900/30 border border-dashed border-zinc-700/50 rounded-xl space-y-2 hover:bg-zinc-900/50 transition-colors">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Adaugă Document</label>
                  <div className="flex gap-2">
                    <Select 
                      value={uploadCategory} 
                      onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                      className="h-8 text-[11px] bg-black/20 border-zinc-700 w-[60%]"
                    >
                        {Object.entries(categoryConfig).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                    </Select>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".pdf,.txt,.csv,.xls,.xlsx,.xml"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 flex-1 text-[10px] bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20"
                      >
                        <Upload size={12} className="mr-1.5" />
                        Upload
                      </Button>
                  </div>
                </div>

                {/* Document Tree Structure */}
                <div className="space-y-1">
                  {Object.entries(categoryConfig).map(([catKey, info]) => {
                    const catDocs = getDocsByCategory(catKey as DocumentCategory);
                    const isExpanded = expandedCategories[catKey];
                    const hasDocs = catDocs.length > 0;

                    return (
                      <div key={catKey} className="rounded-lg overflow-hidden border border-transparent transition-all">
                        <button 
                          onClick={() => toggleCategory(catKey)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${hasDocs ? 'hover:bg-zinc-900' : 'opacity-60 hover:opacity-100'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                              {hasDocs ? <ChevronRight size={12} className="text-zinc-600" /> : <div className="w-3" />}
                            </span>
                            <div className={`p-1 rounded ${hasDocs ? 'bg-zinc-900' : ''} ${info.color}`}>
                              {info.icon}
                            </div>
                            <span className={`text-xs font-medium ${hasDocs ? 'text-zinc-300' : 'text-zinc-500'}`}>{info.label}</span>
                          </div>
                          {hasDocs && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {catDocs.length}
                            </span>
                          )}
                        </button>

                        {/* File List */}
                        {isExpanded && hasDocs && (
                          <div className="pl-9 pr-1 pb-2 space-y-1 animate-fade-in">
                            {catDocs.map(doc => (
                              <div key={doc.id} className="group flex items-center justify-between p-1.5 pl-2 rounded-md bg-zinc-900/30 border border-white/5 hover:border-blue-500/20 transition-all">
                                  <span className="text-[11px] text-zinc-400 truncate max-w-[120px]" title={doc.name}>
                                    {doc.name}
                                  </span>
                                  {onRemoveDocument && (
                                    <button 
                                      onClick={() => onRemoveDocument(doc.id)}
                                      className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
               <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                  <Building size={24} className="text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-500">Nicio firmă selectată.</p>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('settings')} className="mt-2 text-blue-400">
                    Mergi la Firme
                  </Button>
               </div>
            )}
            
            {activeCompany && documents.length === 0 && (
               <div className="flex flex-col items-center justify-center py-10 opacity-40">
                  <FolderOpen size={32} className="text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-500">Dosarul {activeCompany.name} este gol</p>
               </div>
            )}
          </>
        )}

        {/* --- TAB 2: SURSE (Resources) --- */}
        {activeTab === 'resources' && (
          <>
             {onGenerateMindMap && (
                <div className="bg-gradient-to-br from-[#1e3a8a]/20 to-transparent p-3 rounded-xl border border-blue-500/20 mb-4">
                   <div className="flex items-center gap-2 mb-3">
                     <div className="p-1 bg-blue-500/20 rounded text-blue-400"><Network size={14} /></div>
                     <span className="text-xs font-semibold text-blue-100">Analiză Structurală</span>
                   </div>
                   <div className="flex gap-2">
                      <Select 
                        value={complexity}
                        onChange={(e) => setComplexity(e.target.value as MindMapComplexity)}
                        className="h-7 text-[10px] bg-black/40 border-blue-500/20 w-1/3 text-blue-200"
                      >
                         <option value="simple">Simplu</option>
                         <option value="moderate">Mediu</option>
                         <option value="complex">Complex</option>
                      </Select>
                      <Button
                        onClick={() => onGenerateMindMap(complexity)}
                        disabled={isGeneratingMindMap}
                        className="flex-1 h-7 text-[10px] bg-blue-600 hover:bg-blue-500 border-none text-white shadow-lg shadow-blue-900/20"
                      >
                        {isGeneratingMindMap ? 'Se generează...' : 'Generează Harta'}
                      </Button>
                   </div>
                </div>
             )}

             <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Surse Web & Legislație</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe size={12} className="absolute left-2.5 top-2.5 text-zinc-600" />
                    <Input
                      value={currentUrlInput}
                      onChange={(e) => setCurrentUrlInput(e.target.value)}
                      placeholder="Paste link..."
                      className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-700 rounded-lg"
                    />
                  </div>
                  <Button size="icon" onClick={handleAddUrl} className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 border-zinc-700 rounded-lg">
                    <Plus size={14} />
                  </Button>
                </div>

                <div className="space-y-1.5 mt-2">
                  {urls.map((url) => (
                    <div key={url} className="flex items-center justify-between p-2 bg-zinc-900/40 border border-white/5 rounded-lg group hover:border-zinc-700 transition-colors">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-zinc-400 truncate hover:text-blue-400 hover:underline max-w-[150px]">
                           {url.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                      <button onClick={() => onRemoveUrl(url)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {urls.length === 0 && <p className="text-[10px] text-zinc-600 italic pl-1">Nicio sursă externă adăugată.</p>}
                </div>
             </div>
          </>
        )}

        {/* --- TAB 3: CONFIG & COMPANIES --- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
             
             {/* Companies Management */}
             <section className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                   <div className="flex items-center gap-2">
                      <Building size={12} className="text-blue-400" />
                      <h3 className="text-xs font-semibold text-zinc-300">Portofoliu Firme</h3>
                   </div>
                   <Button variant="ghost" size="sm" onClick={onAddCompany} className="h-6 w-6 p-0 text-blue-400 hover:bg-blue-500/10">
                      <PlusCircle size={14} />
                   </Button>
                </div>

                <div className="space-y-2">
                   {companies.map(company => {
                     const isActive = company.id === activeCompanyId;
                     return (
                       <div 
                          key={company.id} 
                          className={`
                            relative p-3 rounded-xl border transition-all cursor-pointer group
                            ${isActive ? 'bg-blue-600/10 border-blue-600/30' : 'bg-zinc-900/40 border-white/5 hover:border-zinc-700'}
                          `}
                          onClick={() => onSwitchCompany(company.id)}
                       >
                          <div className="flex items-start justify-between">
                             <div>
                                <h4 className={`text-xs font-semibold ${isActive ? 'text-blue-100' : 'text-zinc-300'}`}>{company.name}</h4>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{company.cui}</p>
                             </div>
                             {isActive ? (
                               <div className="bg-blue-500 text-white p-1 rounded-full"><Check size={10} /></div>
                             ) : (
                               <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEditCompany(company); }} className="h-6 w-6 text-zinc-500 hover:text-zinc-300">
                                    <Edit size={12} />
                                  </Button>
                               </div>
                             )}
                          </div>
                          
                          {isActive && (
                             <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500/50 rounded-b-xl"></div>
                          )}
                       </div>
                     );
                   })}

                   {companies.length === 0 && (
                     <div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg">
                        <p className="text-[11px] text-zinc-500">Nicio firmă configurată</p>
                        <Button size="sm" onClick={onAddCompany} className="mt-2 text-xs bg-zinc-800 hover:bg-zinc-700">Adaugă Firmă</Button>
                     </div>
                   )}
                </div>
             </section>

             {/* AI Settings */}
             <section className="space-y-3 pt-4 border-t border-white/5">
               <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                  <Cpu size={12} className="text-purple-400" />
                  <h3 className="text-xs font-semibold text-zinc-300">Configurare AI</h3>
               </div>
               
               <div className="grid gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-medium mb-1.5 block">Model AI</label>
                    <Select
                      value={selectedModel}
                      onChange={(e) => onSelectModel && onSelectModel(e.target.value as AiModel)}
                      className="bg-zinc-900 text-[11px] h-8 border-zinc-700 focus:border-purple-500/50"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Standard)</option>
                      <option value="gemini-flash-lite-latest">Gemini Flash Lite (Rapid)</option>
                      <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Complex)</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-medium mb-1.5 block">Context Legislativ</label>
                    <Select
                      value={activeUrlGroupId}
                      onChange={(e) => onSetGroupId(e.target.value)}
                      className="bg-zinc-900 text-[11px] h-8 border-zinc-700"
                    >
                      {urlGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </Select>
                  </div>
               </div>
             </section>

             {/* Active Company Quick Actions (Edit) */}
             {activeCompany && (
                <div className="pt-2">
                   <Button 
                    variant="outline" 
                    onClick={() => onEditCompany(activeCompany)}
                    className="w-full h-8 text-[10px] border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                   >
                     Editează Detalii Firmă Activă
                   </Button>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-zinc-950 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-600">
         <span>v2.2.0 • Multi-Company</span>
         {error && <span className="text-red-400 truncate max-w-[120px] font-medium">{error}</span>}
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;
