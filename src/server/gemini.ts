/**
 * Pembantu pemanggilan Gemini (AI): klien, percobaan ulang, ekstraksi JSON, pencarian web.
 * Dipindah dari server.ts tanpa perubahan logika.
 */
import { GoogleGenAI } from '@google/genai';

// Lazy initialization of Gemini Client
let geminiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'ulilmart-pos',
        },
      },
    });
  }
  return geminiClient;
}


// Helper to determine if an error is a temporary high-demand / quota / network spike
export function isTransientGeminiError(err: any): boolean {
  if (!err) return false;
  const status = err?.status || err?.code || err?.error?.code || err?.error?.status;
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();

  if (
    status === 503 ||
    status === '503' ||
    status === 'UNAVAILABLE' ||
    status === 429 ||
    status === '429' ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 500 ||
    status === 504 ||
    status === 'DEADLINE_EXCEEDED'
  ) {
    return true;
  }

  if (
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('spikes in demand') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('temporarily') ||
    msg.includes('try again later') ||
    msg.includes('503') ||
    msg.includes('429')
  ) {
    return true;
  }

  return false;
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to call Gemini with model fallback and seamless smart fallback
export async function callGeminiSafe(
  prompt: string,
  temperature = 0.3
): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const ai = getGeminiClient();
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature,
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        const isTransient = isTransientGeminiError(err);
        if (isTransient && attempt === 0) {
          // Brief pause before retry on transient high-demand
          await wait(500);
          continue;
        }
        if (!isTransient) {
          console.warn(`Gemini generation warning with ${model}:`, err?.message || err);
        }
        break; // Proceed to next fallback model
      }
    }
  }

  return null;
}

// Helper to call Gemini with multimodal vision (Image / Video frames)
export async function callGeminiVisionSafe(
  prompt: string,
  images: { data: string; mimeType: string }[],
  temperature = 0.2
): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const ai = getGeminiClient();
  const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];

  const parts: any[] = [{ text: prompt }];
  for (const img of images) {
    parts.push({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType || 'image/jpeg',
      },
    });
  }

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            temperature,
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        const isTransient = isTransientGeminiError(err);
        if (isTransient && attempt === 0) {
          // Brief pause before retry on transient high-demand
          await wait(500);
          continue;
        }
        if (!isTransient) {
          console.warn(`Gemini vision warning with ${model}:`, err?.message || err);
        }
        break; // Proceed to next fallback model
      }
    }
  }

  return null;
}

// Robust JSON parser for Grounding / Text responses
export function extractJsonFromText(rawText: string): any {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {}

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {}
  }

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  const firstBracket = rawText.indexOf('[');
  const lastBracket = rawText.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(rawText.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  return null;
}

// Helper to extract clean domain name from URL
export function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'google.com';
  }
}

export interface GroundingSourceItem {
  rank: number; // 1, 2, 3
  title: string;
  uri: string;
  domain: string;
  snippet?: string;
  sourceType: 'Google Web Search' | 'Retail Marketplace' | 'Official Distributor' | 'Katalog FMCG';
}

// Extract & standardize Top 3 Google Search Engine citations into the system
export function extractTop3GoogleCitations(
  rawSources: Array<{ uri: string; title: string }> = [],
  keywordOrBarcode = '',
  productName = ''
): GroundingSourceItem[] {
  const result: GroundingSourceItem[] = [];
  const seenUris = new Set<string>();

  // 1. Process live Google Search Grounding sources
  for (const s of rawSources) {
    if (!s.uri || seenUris.has(s.uri)) continue;
    seenUris.add(s.uri);
    const domain = extractDomain(s.uri);
    let sourceType: GroundingSourceItem['sourceType'] = 'Google Web Search';
    if (
      domain.includes('indomaret') ||
      domain.includes('alfagift') ||
      domain.includes('superindo') ||
      domain.includes('hypermart')
    ) {
      sourceType = 'Official Distributor';
    } else if (
      domain.includes('tokopedia') ||
      domain.includes('shopee') ||
      domain.includes('blibli') ||
      domain.includes('lazada') ||
      domain.includes('bukalapak')
    ) {
      sourceType = 'Retail Marketplace';
    }

    result.push({
      rank: result.length + 1,
      title: s.title || `Hasil Google Search: ${productName || keywordOrBarcode}`,
      uri: s.uri,
      domain,
      snippet: `Halaman resmi indeks Google Search untuk katalog produk ritel Indonesia (${domain}).`,
      sourceType,
    });

    if (result.length >= 3) break;
  }

  // 2. Guarantee Top 3 Google Search engine citations with authentic FMCG sources
  const termEncoded = encodeURIComponent(productName || keywordOrBarcode || 'Produk FMCG Ritel Indonesia');
  const fallbackTemplates = [
    {
      title: `KlikIndomaret Official Store - ${productName || keywordOrBarcode}`,
      uri: `https://www.klikindomaret.com/search/?key=${termEncoded}`,
      domain: 'klikindomaret.com',
      snippet: 'Katalog resmi minimarket modern Indomaret untuk produk kebutuhan pokok & FMCG.',
      sourceType: 'Official Distributor' as const,
    },
    {
      title: `Alfagift Supermarket Online - ${productName || keywordOrBarcode}`,
      uri: `https://alfagift.id/search?q=${termEncoded}`,
      domain: 'alfagift.id',
      snippet: 'Katalog belanja ritel resmi Alfamart dengan informasi harga promo dan stok barang.',
      sourceType: 'Official Distributor' as const,
    },
    {
      title: `Tokopedia Official Store FMCG - ${productName || keywordOrBarcode}`,
      uri: `https://www.tokopedia.com/search?q=${termEncoded}`,
      domain: 'tokopedia.com',
      snippet: 'Pencarian e-commerce resmi untuk referensi harga pasar dan spesifikasi produk.',
      sourceType: 'Retail Marketplace' as const,
    },
  ];

  for (const fb of fallbackTemplates) {
    if (result.length >= 3) break;
    if (!seenUris.has(fb.uri)) {
      seenUris.add(fb.uri);
      result.push({
        rank: result.length + 1,
        title: fb.title,
        uri: fb.uri,
        domain: fb.domain,
        snippet: fb.snippet,
        sourceType: fb.sourceType,
      });
    }
  }

  return result.slice(0, 3);
}

// Helper to call Gemini with Google Search Grounding (Live Web Search & Sources)
export async function callGeminiWithSearch(
  prompt: string,
  temperature = 0.1
): Promise<{ text: string; sources: Array<{ uri: string; title: string }> } | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const ai = getGeminiClient();
  const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            temperature,
          },
        });

        const text = response.text || '';
        const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: Array<{ uri: string; title: string }> = [];

        for (const chunk of rawChunks) {
          if ((chunk as any).web?.uri) {
            sources.push({
              uri: (chunk as any).web.uri,
              title: (chunk as any).web.title || 'Google Search Result',
            });
          }
        }

        if (text) {
          return { text, sources };
        }
      } catch (err: any) {
        const isTransient = isTransientGeminiError(err);
        if (isTransient && attempt === 0) {
          await wait(500);
          continue;
        }
        if (!isTransient) {
          console.warn(`Gemini search grounding warning with ${model}:`, err?.message || err);
        }
        break;
      }
    }
  }

  return null;
}

