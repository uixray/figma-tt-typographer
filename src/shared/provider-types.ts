// ============================================================================
// Provider Configuration Types (V2.1 - Compatible with UText plugin)
// ============================================================================

/**
 * Пользовательская конфигурация провайдера (V2.0 — для обратной совместимости)
 */
export interface UserProviderConfig {
  id: string;
  baseConfigId: string;
  name: string;
  apiKey: string;
  customPricing?: { input: number; output: number };
  customUrl?: string;
  folderId?: string;
  modelName?: string;
  enabled: boolean;
  createdAt: number;
  lastUsed?: number;
}

/**
 * Конфигурация модели внутри группы (V2.1)
 */
export interface ModelConfig {
  id: string;
  baseConfigId: string;
  name: string;
  enabled: boolean;
  customPricing?: { input: number; output: number };
  customUrl?: string;
  modelName?: string;
  lastUsed?: number;
}

/**
 * Группа провайдеров — объединяет несколько моделей с общим API ключом (V2.1)
 */
export interface ProviderGroup {
  id: string;
  name: string;
  baseProviderId: string;
  sharedApiKey: string;
  folderId?: string;
  customUrl?: string;
  sharedProxy?: { url: string; enabled: boolean };
  modelConfigs: ModelConfig[];
  enabled: boolean;
  createdAt: number;
  lastUsed?: number;
}

/**
 * Формат импорта/экспорта провайдеров (совместим с UText)
 */
export interface ProviderExportData {
  version: number;
  exportedAt: string;
  pluginVersion: string;
  settings: {
    providerGroups: ProviderGroup[];
    activeModelId: string;
  };
}
