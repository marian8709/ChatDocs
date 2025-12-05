
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse, Tool, HarmCategory, HarmBlockThreshold, Content, Part, Type } from "@google/genai";
import { UrlContextMetadataItem, LocalDocument, MindMapData, MindMapComplexity, CompanyProfile } from '../types';

// IMPORTANT: The API key MUST be set as an environment variable `process.env.API_KEY`
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI;

// Default model supporting URL context and multimodal inputs.
const DEFAULT_MODEL_NAME = "gemini-2.5-flash"; 
const FALLBACK_MODEL_NAME = "gemini-1.5-flash";

const getAiInstance = (): GoogleGenAI => {
  if (!API_KEY) {
    console.error("API_KEY is not set in environment variables. Please set process.env.API_KEY.");
    throw new Error("Gemini API Key not configured. Set process.env.API_KEY.");
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

interface GeminiResponse {
  text: string;
  urlContextMetadata?: UrlContextMetadataItem[];
}

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = 
      error?.status === 429 || 
      error?.code === 429 ||
      (error?.message && (
        error.message.includes('429') || 
        error.message.includes('quota') || 
        error.message.includes('RESOURCE_EXHAUSTED')
      ));
    
    if (retries > 0 && isQuotaError) {
      console.warn(`Quota limit hit. Retrying in ${delay}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

const handleApiError = (error: any, defaultMsg: string): never => {
  console.error(defaultMsg, error);
  if (error instanceof Error) {
    const googleError = error as any; 
    if (googleError.message && googleError.message.includes("API key not valid")) {
       throw new Error("Invalid API Key. Please check your GEMINI_API_KEY environment variable.");
    }
    if (googleError.status === 429 || (googleError.message && googleError.message.includes("quota"))) {
      throw new Error("API Quota Exceeded. Please try again later or check your billing details.");
    }
    if (googleError.type === 'GoogleGenAIError' && googleError.message) {
      throw new Error(`Gemini API Error: ${googleError.message}`);
    }
    throw new Error(googleError.message || defaultMsg);
  }
  throw new Error(defaultMsg);
};

async function withFallback(
  operation: (model: string) => Promise<GenerateContentResponse>, 
  preferredModel: string
): Promise<GenerateContentResponse> {
  try {
    return await retryOperation(() => operation(preferredModel));
  } catch (error: any) {
    const isNotFoundError = 
      error?.status === 404 || 
      error?.code === 404 || 
      (error?.message && error.message.includes('404')) ||
      (error?.message && error.message.includes('not found'));

    if (isNotFoundError) {
      console.warn(`Model ${preferredModel} not found (404). Falling back to ${FALLBACK_MODEL_NAME}.`);
      return await retryOperation(() => operation(FALLBACK_MODEL_NAME));
    }
    throw error;
  }
}

export const generateContentWithUrlContext = async (
  prompt: string,
  urls: string[],
  documents: LocalDocument[] = [],
  company: CompanyProfile | null,
  modelName: string = DEFAULT_MODEL_NAME
): Promise<GeminiResponse> => {
  const currentAi = getAiInstance();
  
  const parts: Part[] = [];

  // Group documents contextually in the prompt
  let docContext = "";
  if (documents.length > 0) {
     docContext = "Attached Documents:\n";
     documents.forEach(doc => {
        docContext += `- [${doc.category.toUpperCase()}] ${doc.name}\n`;
        parts.push({
          inlineData: {
            mimeType: doc.mimeType,
            data: doc.base64Data
          }
        });
     });
  }

  let fullPrompt = prompt;
  if (urls.length > 0) {
    fullPrompt = `${prompt}\n\nExternal Legal/Fiscal Sources:\n${urls.join('\n')}`;
  }
  
  if (docContext) {
    fullPrompt += `\n\n${docContext}`;
  }
  
  // Custom System Persona
  let companyContext = "";
  if (company) {
    companyContext = `You are acting as the Chief Accountant for the company: "${company.name}" (CUI: ${company.cui}). Activity: ${company.activity}.`;
  } else {
    companyContext = "You are an expert accountant.";
  }

  const systemInstruction = `${companyContext} 
  Respond in Romanian. 
  Your goal is to organize financial data, interpret invoices/statements, and ensure fiscal compliance (Codul Fiscal).
  When analyzing documents, refer to them by their specific category (Invoice, Statement, etc.).
  Be professional, precise, and helpful.`;
  
  parts.push({ text: fullPrompt });

  const tools: Tool[] = urls.length > 0 ? [{ urlContext: {} }] : [];
  const contents: Content[] = [{ role: "user", parts: parts }];

  try {
    const response = await withFallback((model) => 
      currentAi.models.generateContent({
        model: model,
        contents: contents,
        config: { 
          tools: tools,
          safetySettings: safetySettings,
          systemInstruction: systemInstruction,
        },
      }), 
      modelName
    );

    const text = response.text;
    const candidate = response.candidates?.[0];
    let extractedUrlContextMetadata: UrlContextMetadataItem[] | undefined = undefined;

    if (candidate && candidate.urlContextMetadata && candidate.urlContextMetadata.urlMetadata) {
      extractedUrlContextMetadata = candidate.urlContextMetadata.urlMetadata as UrlContextMetadataItem[];
    }
    
    return { text, urlContextMetadata: extractedUrlContextMetadata };

  } catch (error) {
    return handleApiError(error, "Failed to get response from AI.");
  }
};

export const getInitialSuggestions = async (urls: string[], modelName: string = DEFAULT_MODEL_NAME): Promise<GeminiResponse> => {
  if (urls.length === 0) {
    return { text: JSON.stringify({ suggestions: ["Analizează situația fiscală a firmei.", "Verifică deductibilitatea facturilor.", "Calculează TVA de plată."] }) };
  }
  
  const currentAi = getAiInstance();
  const promptText = `Based on the provided fiscal documentation, suggest 3 questions a company owner would ask their accountant. Return ONLY JSON: {"suggestions": ["q1", "q2"]}`;

  const contents: Content[] = [{ role: "user", parts: [{ text: promptText }] }];

  try {
    const response: GenerateContentResponse = await retryOperation(() => 
      currentAi.models.generateContent({
        model: modelName, 
        contents: contents,
        config: {
          safetySettings: safetySettings,
          responseMimeType: "application/json", 
        },
      }), 
      1, 1000
    );
    return { text: response.text }; 

  } catch (error) {
    return { text: JSON.stringify({ suggestions: [] }) };
  }
};

export const generateMindMapFromContext = async (
  urls: string[],
  documents: LocalDocument[],
  complexity: MindMapComplexity = 'moderate',
  modelName: string = DEFAULT_MODEL_NAME
): Promise<MindMapData> => {
  const currentAi = getAiInstance();
  const parts: Part[] = [];

  documents.forEach(doc => {
    parts.push({
      inlineData: { mimeType: doc.mimeType, data: doc.base64Data }
    });
  });

  let promptContext = "Analyze the provided company documents and fiscal context.";
  
  let complexityInstruction = "";
  switch (complexity) {
    case 'simple':
      complexityInstruction = "Create a HIGH-LEVEL overview of the company's financial status or legal structure.";
      break;
    case 'moderate':
      complexityInstruction = "Create a detailed map of financial flows, obligations, or document relationships.";
      break;
    case 'complex':
      complexityInstruction = "Create a COMPREHENSIVE audit map breaking down every transaction type, legal obligation, and risk.";
      break;
  }

  const promptText = `${promptContext} ${complexityInstruction} Return ONLY JSON structure: { "label": "Main", "children": [...] }`;

  parts.push({ text: promptText });
  const contents: Content[] = [{ role: "user", parts: parts }];
  
  try {
    const response = await withFallback((model) => 
      currentAi.models.generateContent({
        model: model,
        contents: contents,
        config: {
          responseMimeType: "application/json",
          safetySettings: safetySettings
        }
      }),
      modelName
    );

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("No data returned for Mind Map");
    const parsed = JSON.parse(jsonStr);
    return parsed as MindMapData;

  } catch (error) {
    return handleApiError(error, "Failed to generate mind map.");
  }
};
