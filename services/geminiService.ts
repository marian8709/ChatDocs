/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse, Tool, HarmCategory, HarmBlockThreshold, Content, Part, Type } from "@google/genai";
import { UrlContextMetadataItem, LocalDocument, MindMapData, MindMapComplexity } from '../types';

// IMPORTANT: The API key MUST be set as an environment variable `process.env.API_KEY`
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI;

// Model supporting URL context and multimodal inputs.
const MODEL_NAME = "gemini-2.5-flash"; 

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

/**
 * Retries an async operation with exponential backoff if a 429 (Quota Exceeded) error occurs.
 */
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check for rate limit/quota errors in various formats
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

/**
 * Parses and throws a user-friendly error message.
 */
const handleApiError = (error: any, defaultMsg: string): never => {
  console.error(defaultMsg, error);
  if (error instanceof Error) {
    const googleError = error as any; 
    
    // Check for API Key issues
    if (googleError.message && googleError.message.includes("API key not valid")) {
       throw new Error("Invalid API Key. Please check your GEMINI_API_KEY environment variable.");
    }
    
    // Check for Quota issues explicit throw
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

export const generateContentWithUrlContext = async (
  prompt: string,
  urls: string[],
  documents: LocalDocument[] = []
): Promise<GeminiResponse> => {
  const currentAi = getAiInstance();
  
  // Construct the parts array
  const parts: Part[] = [];

  // 1. Add Documents (Images, PDFs, Text files) as inlineData
  documents.forEach(doc => {
    parts.push({
      inlineData: {
        mimeType: doc.mimeType,
        data: doc.base64Data
      }
    });
  });

  // 2. Add the text prompt
  let fullPrompt = prompt;
  if (urls.length > 0) {
    const urlList = urls.join('\n');
    fullPrompt = `${prompt}\n\nRelevant URLs for context:\n${urlList}`;
  }
  
  parts.push({ text: fullPrompt });

  const tools: Tool[] = urls.length > 0 ? [{ urlContext: {} }] : [];
  const contents: Content[] = [{ role: "user", parts: parts }];

  try {
    const response: GenerateContentResponse = await retryOperation(() => 
      currentAi.models.generateContent({
        model: MODEL_NAME,
        contents: contents,
        config: { 
          tools: tools,
          safetySettings: safetySettings,
        },
      })
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

export const getInitialSuggestions = async (urls: string[]): Promise<GeminiResponse> => {
  if (urls.length === 0) {
    return { text: JSON.stringify({ suggestions: ["Add some URLs or Documents to get topic suggestions."] }) };
  }
  
  const currentAi = getAiInstance();
  const urlList = urls.join('\n');
  
  const promptText = `Based on the content of the following documentation URLs, provide 3-4 concise and actionable questions a developer might ask to explore these documents. Return ONLY a JSON object with a key "suggestions" containing an array of these question strings.

Relevant URLs:
${urlList}`;

  const contents: Content[] = [{ role: "user", parts: [{ text: promptText }] }];

  try {
    // We retry suggestions too, but maybe fewer times to avoid blocking the UI load
    const response: GenerateContentResponse = await retryOperation(() => 
      currentAi.models.generateContent({
        model: MODEL_NAME,
        contents: contents,
        config: {
          safetySettings: safetySettings,
          responseMimeType: "application/json", 
        },
      }), 
      1, // Fewer retries for non-critical path
      1000
    );

    return { text: response.text }; 

  } catch (error) {
    console.warn("Error fetching suggestions (silenced):", error);
    // Return empty suggestion set instead of throwing, so the main app doesn't break
    return { text: JSON.stringify({ suggestions: [] }) };
  }
};

export const generateMindMapFromContext = async (
  urls: string[],
  documents: LocalDocument[],
  complexity: MindMapComplexity = 'moderate'
): Promise<MindMapData> => {
  const currentAi = getAiInstance();
  const parts: Part[] = [];

  documents.forEach(doc => {
    parts.push({
      inlineData: { mimeType: doc.mimeType, data: doc.base64Data }
    });
  });

  let promptContext = "Analyze the provided documents.";
  if (urls.length > 0) {
    promptContext += ` Also consider these URLs:\n${urls.join('\n')}`;
  }

  let complexityInstruction = "";
  switch (complexity) {
    case 'simple':
      complexityInstruction = "Create a HIGH-LEVEL overview. Limit the structure to max 2 levels deep (Root -> Main Topics -> Sub-points). Keep children count per node low (3-4 max). Focus only on big-picture concepts.";
      break;
    case 'moderate':
      complexityInstruction = "Create a STANDARD detailed mind map. Aim for 3 levels of depth. Include clear main topics and supporting details. Balance breadth and depth.";
      break;
    case 'complex':
      complexityInstruction = "Create a COMPREHENSIVE and DEEP mind map. Aim for 4+ levels of depth where appropriate. Break down every concept into detailed sub-nodes. Be exhaustive in capturing the content structure.";
      break;
  }

  const promptText = `${promptContext}
  
  ${complexityInstruction}
  
  The output MUST be a valid JSON object representing the root node.
  
  Structure format:
  {
    "label": "Main Topic",
    "details": "Optional short description",
    "children": [
      {
        "label": "Subtopic 1",
        "details": "Key point",
        "children": [...]
      }
    ]
  }

  Ensure labels are concise (max 5-7 words).
  Return ONLY the JSON.`;

  parts.push({ text: promptText });
  const contents: Content[] = [{ role: "user", parts: parts }];
  
  try {
    const response: GenerateContentResponse = await retryOperation(() => 
      currentAi.models.generateContent({
        model: MODEL_NAME,
        contents: contents,
        config: {
          responseMimeType: "application/json",
          safetySettings: safetySettings
        }
      })
    );

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("No data returned for Mind Map");
    
    const parsed = JSON.parse(jsonStr);
    return parsed as MindMapData;

  } catch (error) {
    return handleApiError(error, "Failed to generate mind map.");
  }
};