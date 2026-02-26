/**
 * Utility functions for Provider Groups (V2.1)
 * Compatible with UText plugin
 */

import type { ProviderGroup, ModelConfig, UserProviderConfig } from './provider-types';
import { PROVIDER_CONFIGS, type ProviderConfig } from './providers';

/** Settings-like shape used by utility functions */
export interface ProviderSettings {
  providerGroups?: ProviderGroup[];
  activeModelId?: string;
}

export function getActiveModels(settings: ProviderSettings): ModelConfig[] {
  if (!settings.providerGroups?.length) return [];
  const models: ModelConfig[] = [];
  for (const group of settings.providerGroups) {
    if (!group.enabled) continue;
    for (const model of group.modelConfigs) {
      if (model.enabled) models.push(model);
    }
  }
  return models;
}

export function getAllModels(settings: ProviderSettings): ModelConfig[] {
  if (!settings.providerGroups?.length) return [];
  const models: ModelConfig[] = [];
  for (const group of settings.providerGroups) {
    models.push(...group.modelConfigs);
  }
  return models;
}

export function findGroupByModelId(settings: ProviderSettings, modelId: string): ProviderGroup | null {
  if (!settings.providerGroups) return null;
  for (const group of settings.providerGroups) {
    if (group.modelConfigs.some((m) => m.id === modelId)) return group;
  }
  return null;
}

export function findModelById(settings: ProviderSettings, modelId: string): { group: ProviderGroup; model: ModelConfig } | null {
  if (!settings.providerGroups) return null;
  for (const group of settings.providerGroups) {
    const model = group.modelConfigs.find((m) => m.id === modelId);
    if (model) return { group, model };
  }
  return null;
}

export function modelToUserConfig(group: ProviderGroup, model: ModelConfig): UserProviderConfig {
  const resolvedCustomUrl =
    group.baseProviderId === 'lmstudio' ? group.customUrl :
    model.customUrl;

  return {
    id: model.id,
    baseConfigId: model.baseConfigId,
    name: model.name,
    apiKey: group.baseProviderId === 'lmstudio' ? 'not-required' : group.sharedApiKey,
    customPricing: model.customPricing,
    customUrl: resolvedCustomUrl,
    folderId: group.folderId,
    modelName: model.modelName,
    enabled: model.enabled && group.enabled,
    createdAt: group.createdAt,
    lastUsed: model.lastUsed,
  };
}

export function getBaseConfigForModel(baseConfigId: string): ProviderConfig | null {
  return PROVIDER_CONFIGS.find((c) => c.id === baseConfigId) || null;
}

export function createProviderGroup(params: {
  name: string;
  baseProviderId: string;
  apiKey: string;
  modelIds: string[];
  folderId?: string;
  customUrl?: string;
}): ProviderGroup {
  const modelConfigs: ModelConfig[] = params.modelIds.map((configId) => {
    const baseConfig = PROVIDER_CONFIGS.find((p) => p.id === configId);
    if (!baseConfig) throw new Error(`Base config not found: ${configId}`);
    return {
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      baseConfigId: configId,
      name: baseConfig.name,
      enabled: true,
    };
  });

  return {
    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: params.name,
    baseProviderId: params.baseProviderId,
    sharedApiKey: params.apiKey,
    folderId: params.folderId,
    customUrl: params.customUrl,
    modelConfigs,
    enabled: true,
    createdAt: Date.now(),
  };
}

export function addModelToGroup(group: ProviderGroup, baseConfigId: string): ProviderGroup {
  const baseConfig = PROVIDER_CONFIGS.find((p) => p.id === baseConfigId);
  if (!baseConfig) throw new Error(`Base config not found: ${baseConfigId}`);
  if (group.modelConfigs.some((m) => m.baseConfigId === baseConfigId)) {
    throw new Error(`Model ${baseConfigId} already exists in group`);
  }
  return {
    ...group,
    modelConfigs: [...group.modelConfigs, {
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      baseConfigId,
      name: baseConfig.name,
      enabled: true,
    }],
  };
}

export function removeModelFromGroup(group: ProviderGroup, modelId: string): ProviderGroup {
  return { ...group, modelConfigs: group.modelConfigs.filter((m) => m.id !== modelId) };
}

export function updateModelInGroup(group: ProviderGroup, modelId: string, updates: Partial<ModelConfig>): ProviderGroup {
  return {
    ...group,
    modelConfigs: group.modelConfigs.map((m) => m.id === modelId ? { ...m, ...updates } : m),
  };
}

export function getAvailableModelsForGroup(group: ProviderGroup): ProviderConfig[] {
  const existingConfigIds = new Set(group.modelConfigs.map((m) => m.baseConfigId));
  return PROVIDER_CONFIGS.filter(
    (config) => config.provider === group.baseProviderId && !existingConfigIds.has(config.id)
  );
}
