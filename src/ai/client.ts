import type { AiMode } from './prompts';
import { getPrompt } from './prompts';
import type { Locale } from '../core/rule';

export interface AiConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
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

/** Default models per provider */
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
};

/**
 * Process text through AI API.
 * Called from the UI iframe via fetch() — network access required in manifest.
 */
export async function processWithAi(text: string, config: AiConfig): Promise<AiResult> {
  const prompt = getPrompt(config.mode, config.locale, config.styleVariant);
  const systemPrompt = config.mode === 'custom'
    ? (config.customPrompt || 'Fix the typography of the following text. Return only the corrected text.')
    : prompt.system;
  const userMessage = prompt.user(text);
  const model = config.model || DEFAULT_MODELS[config.provider];

  try {
    if (config.provider === 'anthropic') {
      return await callAnthropic(systemPrompt, userMessage, config.apiKey, model);
    } else {
      return await callOpenAI(systemPrompt, userMessage, config.apiKey, model);
    }
  } catch (error) {
    return {
      text: text,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function callAnthropic(
  system: string,
  userMessage: string,
  apiKey: string,
  model: string
): Promise<AiResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0];
  return {
    text: content?.text || userMessage,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function callOpenAI(
  system: string,
  userMessage: string,
  apiKey: string,
  model: string
): Promise<AiResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return {
    text: choice?.message?.content || userMessage,
    tokensUsed: data.usage?.total_tokens,
  };
}
