
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum MessageSender {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export interface UrlContextMetadataItem {
  retrievedUrl: string;
  urlRetrievalStatus: string;
}

export type DocumentCategory = 'invoice_in' | 'invoice_out' | 'bank_statement' | 'contract' | 'fiscal_doc' | 'general';

export interface LocalDocument {
  id: string;
  companyId: string; // Legatura cu firma
  name: string;
  mimeType: string;
  base64Data: string;
  category: DocumentCategory;
  timestamp: number;
}

export interface CompanyProfile {
  id: string; // Identificator unic
  name: string;
  cui: string;
  regCom?: string;
  activity?: string;
  foundedYear?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  isLoading?: boolean;
  urlContext?: UrlContextMetadataItem[];
}

export interface URLGroup {
  id: string;
  name: string;
  urls: string[];
}

export interface MindMapData {
  label: string;
  details?: string;
  children?: MindMapData[];
}

export type MindMapComplexity = 'simple' | 'moderate' | 'complex';

export type AiModel = 'gemini-2.5-flash' | 'gemini-flash-lite-latest' | 'gemini-3-pro-preview';
