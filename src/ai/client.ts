import type { AiMode } from './prompts';
import { getPrompt } from './prompts';
import type { Locale } from '../core/rule';
import type { ProviderGroup, ModelConfig } from '../shared/provider-types';
import { getBaseConfigForModel } from '../shared/provider-groups-utils';

export interface AiConfig {
  group: ProviderGroup;
  model: ModelConfig;
  mode: AiMode;
  locale: Locale;
  styleVariant?: string;
  customPrompt?: string;
}

export interface AiResult {
  text: string;
  tokensUsed?: number;
  error?: string;
}

/**
 * Process text through AI API using the resolved provider group + model.
 * Called from the UI iframe via fetch().
 */
export async function processWithAi(text: string, config: AiConfig): Promise<AiResult> {
  const prompt = getPrompt(config.mode, config.locale, config.styleVariant);
  const systemPrompt = config.mode === 'custom'
    ? (config.customPrompt || 'Fix the typography of the following text. Return only the corrected text.')
    : prompt.system;
  const userMessage = prompt.user(text);

  const baseConfig = getBaseConfigForModel(config.model.baseConfigId);
  if (!baseConfig) {
    return { text, error: `Unknown model config: ${config.model.baseConfigId}` };
  }

  const providerType = baseConfig.provider;
  const apiKey = config.group.sharedApiKey;
  const model = baseConfig.model;
  const apiUrl = resolveApiUrl(baseConfig.apiUrl, config.group, config.model);
  const maxTokens = baseConfig.limits?.maxTokens || 4096;

  try {
    switch (providerType) {
      case 'openai':
      case 'groq':
      case 'mistral':
      case 'lmstudio':
        return await callOpenAICompatible(apiUrl, systemPrompt, userMessage, apiKey, model, maxTokens, config.model.modelName);

      case 'claude':
        return await callClaude(apiUrl, systemPrompt, userMessage, apiKey, model, maxTokens);

      case 'gemini':
        return await callGemini(apiUrl, systemPrompt, userMessage, apiKey, model, maxTokens);

      case 'cohere':
        return await callCohere(apiUrl, systemPrompt, userMessage, apiKey, maxTokens);

      case 'yandex':
        return await callYandex(apiUrl, systemPrompt, userMessage, apiKey, model, maxTokens, config.group.folderId);

      default:
        return { text, error: `Unsupported provider: ${providerType}` };
    }
  } catch (error) {
    return { text, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function resolveApiUrl(templateUrl: string, group: ProviderGroup, model: ModelConfig): string {
  if (templateUrl.includes('{{baseUrl}}')) {
    const baseUrl = group.customUrl || model.customUrl || 'http://localhost:1234';
    return templateUrl.replace('{{baseUrl}}', baseUrl.replace(/\/+$/, ''));
  }
  return model.customUrl || templateUrl;
}

// --- OpenAI-compatible (OpenAI, Groq, Mistral, LM Studio) ---

async function callOpenAICompatible(
  apiUrl: string, system: string, userMessage: string,
  apiKey: string, model: string, maxTokens: number, modelName?: string
): Promise<AiResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && apiKey !== 'not-required') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelName || model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || userMessage,
    tokensUsed: data.usage?.total_tokens,
  };
}

// --- Anthropic Claude ---

async function callClaude(
  apiUrl: string, system: string, userMessage: string,
  apiKey: string, model: string, maxTokens: number
): Promise<AiResult> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || userMessage,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

// --- Google Gemini ---

async function callGemini(
  apiUrl: string, system: string, userMessage: string,
  apiKey: string, model: string, maxTokens: number
): Promise<AiResult> {
  const url = `${apiUrl}/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || userMessage;
  const usage = data.usageMetadata;
  return {
    text,
    tokensUsed: usage ? (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0) : undefined,
  };
}

// --- Cohere ---

async function callCohere(
  apiUrl: string, system: string, userMessage: string,
  apiKey: string, maxTokens: number
): Promise<AiResult> {
  const response = await fetch(`${apiUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      message: userMessage,
      preamble: system,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cohere API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    text: data.text || userMessage,
    tokensUsed: data.meta?.tokens ? (data.meta.tokens.input_tokens || 0) + (data.meta.tokens.output_tokens || 0) : undefined,
  };
}

// --- Yandex Cloud ---

async function callYandex(
  apiUrl: string, system: string, userMessage: string,
  apiKey: string, model: string, maxTokens: number, folderId?: string
): Promise<AiResult> {
  const modelUri = folderId ? `gpt://${folderId}/${model}` : model;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Api-Key ${apiKey}`,
    },
    body: JSON.stringify({
      modelUri,
      completionOptions: { maxTokens: String(maxTokens) },
      messages: [
        { role: 'system', text: system },
        { role: 'user', text: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yandex API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const alt = data.result?.alternatives?.[0];
  const usage = data.result?.usage;
  return {
    text: alt?.message?.text || userMessage,
    tokensUsed: usage ? (parseInt(usage.inputTextTokens || '0') + parseInt(usage.completionTokens || '0')) : undefined,
  };
}
