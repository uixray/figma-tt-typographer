import type { TypographySettings } from '../core/rule';
import { DEFAULT_SETTINGS } from '../core/rule';
import type { ProviderGroup } from '../shared/provider-types';

const STORAGE_KEY = 'tt-typographer-settings';
const PROVIDERS_KEY = 'tt-typo-providers';

/**
 * Shared namespace for cross-plugin provider sharing.
 * All UIXRay plugins use this same namespace to read/write provider groups
 * via figma.root.setSharedPluginData / getSharedPluginData.
 */
const SHARED_NAMESPACE = 'uixray-providers';
const SHARED_GROUPS_KEY = 'providerGroups';
const SHARED_UPDATED_KEY = 'lastUpdated';

/** Save settings to Figma client storage */
export async function saveSettings(settings: TypographySettings): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEY, JSON.stringify(settings));
}

/** Load settings from Figma client storage (with migration from old format) */
export async function loadSettings(): Promise<TypographySettings> {
  try {
    const raw = await figma.clientStorage.getAsync(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old format: ai.provider + ai.apiKey → new format
      if (parsed.ai && 'provider' in parsed.ai && 'apiKey' in parsed.ai) {
        const oldAi = parsed.ai;
        parsed.ai = {
          enabled: oldAi.enabled ?? true,
          activeModelId: '',
          mode: oldAi.mode || 'typography',
          customPrompt: oldAi.customPrompt,
          styleVariant: oldAi.styleVariant,
        };
        if (oldAi.apiKey) {
          const oldProvider = oldAi.provider || 'openai';
          const baseConfigId = oldProvider === 'anthropic' ? 'claude-35-haiku' : 'openai-gpt4o-mini';
          const group: ProviderGroup = {
            id: `group-migrated-${Date.now()}`,
            name: oldProvider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI',
            baseProviderId: oldProvider === 'anthropic' ? 'claude' : 'openai',
            sharedApiKey: oldAi.apiKey,
            modelConfigs: [{
              id: `model-migrated-${Date.now()}`,
              baseConfigId,
              name: oldProvider === 'anthropic' ? 'Claude 3.5 Haiku' : 'GPT-4o Mini',
              enabled: true,
            }],
            enabled: true,
            createdAt: Date.now(),
          };
          await saveProviderGroups([group]);
          parsed.ai.activeModelId = group.modelConfigs[0].id;
        }
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save provider groups to:
 * 1. Local clientStorage (persists per-plugin, survives across documents)
 * 2. Shared plugin data on figma.root (shared across all UIXRay plugins in this document)
 */
export async function saveProviderGroups(groups: ProviderGroup[]): Promise<void> {
  const json = JSON.stringify(groups);
  const timestamp = String(Date.now());

  // Save to local per-plugin storage
  await figma.clientStorage.setAsync(PROVIDERS_KEY, json);
  await figma.clientStorage.setAsync(`${PROVIDERS_KEY}-updated`, timestamp);

  // Save to shared cross-plugin storage (document-level)
  try {
    figma.root.setSharedPluginData(SHARED_NAMESPACE, SHARED_GROUPS_KEY, json);
    figma.root.setSharedPluginData(SHARED_NAMESPACE, SHARED_UPDATED_KEY, timestamp);
  } catch {
    // Shared data may fail in some contexts, local is sufficient
  }
}

/**
 * Load provider groups with cross-plugin sync:
 * 1. Read from shared plugin data (may have been written by another UIXRay plugin)
 * 2. Read from local clientStorage
 * 3. Use whichever is newer, merge if needed
 */
export async function loadProviderGroups(): Promise<ProviderGroup[]> {
  let localGroups: ProviderGroup[] = [];
  let localTimestamp = 0;
  let sharedGroups: ProviderGroup[] = [];
  let sharedTimestamp = 0;

  // Load from local storage
  try {
    const raw = await figma.clientStorage.getAsync(PROVIDERS_KEY);
    if (raw) localGroups = JSON.parse(raw);
    const ts = await figma.clientStorage.getAsync(`${PROVIDERS_KEY}-updated`);
    if (ts) localTimestamp = parseInt(ts, 10) || 0;
  } catch { /* ignore */ }

  // Load from shared storage (written by any UIXRay plugin)
  try {
    const sharedRaw = figma.root.getSharedPluginData(SHARED_NAMESPACE, SHARED_GROUPS_KEY);
    if (sharedRaw) sharedGroups = JSON.parse(sharedRaw);
    const sharedTs = figma.root.getSharedPluginData(SHARED_NAMESPACE, SHARED_UPDATED_KEY);
    if (sharedTs) sharedTimestamp = parseInt(sharedTs, 10) || 0;
  } catch { /* ignore */ }

  // Decide which source to use
  if (sharedGroups.length > 0 && localGroups.length > 0) {
    // Both have data — use the newer one
    if (sharedTimestamp > localTimestamp) {
      // Shared is newer (another plugin updated providers) — sync to local
      await figma.clientStorage.setAsync(PROVIDERS_KEY, JSON.stringify(sharedGroups));
      await figma.clientStorage.setAsync(`${PROVIDERS_KEY}-updated`, String(sharedTimestamp));
      return sharedGroups;
    }
    // Local is newer — sync to shared
    try {
      figma.root.setSharedPluginData(SHARED_NAMESPACE, SHARED_GROUPS_KEY, JSON.stringify(localGroups));
      figma.root.setSharedPluginData(SHARED_NAMESPACE, SHARED_UPDATED_KEY, String(localTimestamp));
    } catch { /* ignore */ }
    return localGroups;
  }

  if (sharedGroups.length > 0) {
    // Only shared has data — adopt it
    await figma.clientStorage.setAsync(PROVIDERS_KEY, JSON.stringify(sharedGroups));
    await figma.clientStorage.setAsync(`${PROVIDERS_KEY}-updated`, String(sharedTimestamp));
    return sharedGroups;
  }

  if (localGroups.length > 0) {
    // Only local has data — publish to shared
    try {
      figma.root.setSharedPluginData(SHARED_NAMESPACE, SHARED_GROUPS_KEY, JSON.stringify(localGroups));
      figma.root.setSharedPluginData(SHARED_NAMESPACE, SHARED_UPDATED_KEY, String(localTimestamp || Date.now()));
    } catch { /* ignore */ }
    return localGroups;
  }

  return [];
}
