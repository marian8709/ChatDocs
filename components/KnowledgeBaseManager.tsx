/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, X, FileText, Upload, Globe, BookOpen, Network, Loader2, Layers } from 'lucide-react';
import { URLGroup, LocalDocument, MindMapComplexity } from '../types';

interface KnowledgeBaseManagerProps {
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
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ 
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
}) => {
  const [currentUrlInput, setCurrentUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [complexity, setComplexity] = useState<MindMapComplexity>('moderate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUrl = (urlString: string): string | null => {
    const trimmed = urlString.trim();
    if (!trimmed) {
      return 'URL cannot be empty.';
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      return 'Missing protocol (http/https).';
    }
    try {
      const url = new URL(trimmed);
      if (url.hostname !== 'localhost' && !url.hostname.includes('.')) {
        return 'Invalid domain.';
      }
    } catch (e) {
      return 'Invalid URL format.';
    }
    return null;
  };

  const handleAddUrl = () => {
    const validationError = validateUrl(currentUrlInput);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    if (urls.length >= maxUrls) {
      setError(`Max ${maxUrls} URLs reached.`);
      return;
    }
    if (urls.includes(currentUrlInput)) {
      setError('URL already added.');
      return;
    }
    onAddUrl(currentUrlInput);
    setCurrentUrlInput('');
    setError(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onAddDocument) return;

    if (file.size > 10 * 1024 * 1024) { 
      setError('File too large (>10MB).');
      return;
    }

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const newDoc: LocalDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data: base64Data
      };

      onAddDocument(newDoc);
      setError(null);
    } catch (e) {
      console.error("Error reading file:", e);
      setError('Failed to process file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const hasContent = urls.length > 0 || documents.length > 0;

  return (
    <div className="flex flex-col h-full bg-transparent text-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-2 text-white font-semibold tracking-tight">
          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
            <BookOpen size={18} />
          </div>
          <span>Registru Fiscal & Documente</span>
        </div>
        {onCloseSidebar && (
          <button
            onClick={onCloseSidebar}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-md transition-all md:hidden"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      <div className="p-4 flex-grow overflow-y-auto space-y-6 scrollbar-hide">
        
        {/* Topic Selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 pl-1">
            Colecție Activă
          </label>
          <div className="relative group">
            <select
              value={activeUrlGroupId}
              onChange={(e) => onSetGroupId(e.target.value)}
              className="w-full appearance-none bg-neutral-900 border border-neutral-800 text-neutral-200 py-2.5 pl-3 pr-8 rounded-lg focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none cursor-pointer hover:border-neutral-700"
            >
              {urlGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none group-hover:text-neutral-300 transition-colors"
            />
          </div>
        </div>
        
        {/* Tools Section */}
        {onGenerateMindMap && (
           <div className="space-y-2">
            <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500 pl-1">
              <span>Unelte</span>
              {hasContent && (
                <span className="flex items-center gap-1 text-[9px] font-normal normal-case bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                  <Layers size={10} />
                  Complexitate
                </span>
              )}
            </label>
            
            {hasContent && (
              <div className="flex gap-1 mb-2">
                {(['simple', 'moderate', 'complex'] as MindMapComplexity[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setComplexity(level)}
                    className={`
                      flex-1 py-1 text-[10px] uppercase font-bold tracking-wide rounded-md border transition-all
                      ${complexity === level 
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800'
                      }
                    `}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => onGenerateMindMap(complexity)}
              disabled={!hasContent || isGeneratingMindMap}
              className={`
                w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-all shadow-sm
                ${hasContent 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20' 
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                }
              `}
            >
              {isGeneratingMindMap ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generez Structura...</span>
                </>
              ) : (
                <>
                  <Network size={14} />
                  <span>Generează Mind Map Fiscal</span>
                </>
              )}
            </button>
            {!hasContent && (
               <p className="text-[10px] text-neutral-600 text-center">Adaugă conținut pentru a genera harta.</p>
            )}
           </div>
        )}

        <hr className="border-white/5 my-2" />

        {/* URLs */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 pl-1">
            <Globe size={12} /> Resurse Web (ANAF/Monitor)
          </label>
          
          <div className="flex gap-2">
            <input
              type="url"
              value={currentUrlInput}
              onChange={(e) => {
                setCurrentUrlInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://anaf.ro/..."
              className={`flex-1 bg-neutral-900 border text-neutral-200 placeholder-neutral-600 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all ${error && error.includes('URL') ? 'border-red-900/50' : 'border-neutral-800 hover:border-neutral-700'}`}
              onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
            />
            <button
              onClick={handleAddUrl}
              disabled={urls.length >= maxUrls}
              className="p-2 bg-neutral-800 hover:bg-blue-600 text-neutral-400 hover:text-white rounded-lg transition-colors border border-neutral-700 hover:border-blue-500"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-1 mt-2">
             {urls.length === 0 && (
              <div className="text-neutral-600 text-xs text-center py-4 border border-dashed border-neutral-800 rounded-lg">
                Niciun link adăugat.
              </div>
            )}
            {urls.map((url) => (
              <div key={url} className="group flex items-center justify-between p-2.5 bg-neutral-900/50 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 rounded-lg transition-all">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline truncate mr-2 font-medium">
                  {url.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
                <button 
                  onClick={() => onRemoveUrl(url)}
                  className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-2">
           <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 pl-1">
            <FileText size={12} /> Documente (PDF/CSV/TXT)
          </label>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.txt,.md,.csv,.html"
          />
          
          <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border border-dashed border-neutral-700 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg text-neutral-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-medium group"
          >
            <Upload size={14} className="group-hover:-translate-y-0.5 transition-transform" />
            <span>Încarcă Document</span>
          </button>

          <div className="space-y-1 mt-2">
             {documents.map((doc) => (
              <div key={doc.id} className="group flex items-center justify-between p-2.5 bg-neutral-900/50 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 rounded-lg transition-all">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1 bg-neutral-800 rounded text-neutral-400">
                     <FileText size={12} />
                  </div>
                  <span className="text-xs text-neutral-300 truncate font-medium">{doc.name}</span>
                </div>
                {onRemoveDocument && (
                   <button 
                    onClick={() => onRemoveDocument(doc.id)}
                    className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer Info / Errors */}
      <div className="p-4 border-t border-white/5 bg-neutral-900/30">
        {error && (
          <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-200 animate-fade-in">
            {error}
          </div>
        )}
        <div className="flex justify-between text-[10px] text-neutral-600 font-medium">
          <span>{urls.length}/{maxUrls} Link-uri</span>
          <span>{documents.length} Fișiere</span>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;