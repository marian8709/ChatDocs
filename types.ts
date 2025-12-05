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
  retrievedUrl: string; // Changed from retrieved_url
  urlRetrievalStatus: string; // Changed from url_retrieval_status
}

export interface LocalDocument {
  id: string;
  name: string;
  mimeType: string;
  base64Data: string; // Raw base64 string (without data:mime;base64 prefix)
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
