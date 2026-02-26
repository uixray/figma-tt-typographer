// UI logic for TT Typographer plugin
import { processWithAi } from '../ai/client';
import type { AiConfig } from '../ai/client';
// Provider types are duplicated here for UI-side state management

interface RuleInfo {
  id: string;
  name: Record<string, string>;
  locale: string;
  group: string;
  enabled: boolean;
}

interface ModelConfig {
  id: string;
  baseConfigId: string;
  name: string;
  enabled: boolean;
  customUrl?: string;
  modelName?: string;
}

interface ProviderGroup {
  id: string;
  name: string;
  baseProviderId: string;
  sharedApiKey: string;
  folderId?: string;
  customUrl?: string;
  modelConfigs: ModelConfig[];
  enabled: boolean;
  createdAt: number;
}

interface ProviderConfigInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
}

interface SettingsData {
  type: 'settings-data';
  settings: any;
  rules: RuleInfo[];
  providerGroups: ProviderGroup[];
  providerCatalog: Record<string, ProviderConfigInfo[]>;
}

interface PreviewData {
  type: 'preview-data';
  previews: Array<{ original: string; result: string; name: string }>;
}

interface AiTextsData {
  type: 'ai-texts-data';
  texts: Array<{ nodeId: string; text: string; name: string }>;
  settings: any;
}

interface AiComplete {
  type: 'ai-complete';
  changesCount: number;
  totalNodes: number;
}

interface AiError {
  type: 'ai-error';
  error: string;
}

type IncomingMessage = SettingsData | PreviewData | AiTextsData | AiComplete | AiError;

// --- State ---
let currentRules: RuleInfo[] = [];
let currentSettings: any = {};
let currentTab = 'rules';
let providerGroups: ProviderGroup[] = [];
let providerCatalog: Record<string, ProviderConfigInfo[]> = {};
let addingProviderId = ''; // baseProviderId being added

// --- Tab switching ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = (tab as HTMLElement).dataset.tab!;
    currentTab = tabId;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`content-${tabId}`)!.classList.add('active');
  });
});

// --- AI mode field visibility ---
const aiModeSelect = document.getElementById('ai-mode') as HTMLSelectElement;
aiModeSelect.addEventListener('change', () => {
  const mode = aiModeSelect.value;
  document.getElementById('style-variant-field')!.style.display = mode === 'style' ? 'flex' : 'none';
  document.getElementById('custom-prompt-field')!.style.display = mode === 'custom' ? 'flex' : 'none';
});

// --- Rules rendering ---
function renderRules(rules: RuleInfo[]): void {
  const container = document.getElementById('rules-container')!;
  container.innerHTML = '';

  const groups = new Map<string, RuleInfo[]>();
  for (const rule of rules) {
    if (!groups.has(rule.group)) groups.set(rule.group, []);
    groups.get(rule.group)!.push(rule);
  }

  const groupNames: Record<string, string> = {
    case: 'Регистр', yo: 'Ёфикация', quotes: 'Кавычки', dashes: 'Тире',
    spaces: 'Пробелы', numbers: 'Числа', currency: 'Валюта',
    punctuation: 'Пунктуация', special: 'Спецсимволы', width: 'Ширина символов',
    layout: 'Макет',
  };

  for (const [group, groupRules] of groups) {
    const div = document.createElement('div');
    div.className = 'rule-group';

    const header = document.createElement('div');
    header.className = 'rule-group-header';
    header.innerHTML = `<span>${groupNames[group] || group}</span><span class="toggle-all" data-group="${group}">вкл/выкл</span>`;
    div.appendChild(header);

    header.querySelector('.toggle-all')!.addEventListener('click', (e) => {
      e.stopPropagation();
      const cbs = div.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      const allChecked = Array.from(cbs).every(cb => cb.checked);
      cbs.forEach(cb => { cb.checked = !allChecked; });
    });

    for (const rule of groupRules) {
      const item = document.createElement('label');
      item.className = 'rule-item';
      item.innerHTML = `<input type="checkbox" data-rule-id="${rule.id}" ${rule.enabled ? 'checked' : ''}><span>${rule.name.ru || rule.name.en || rule.id}</span>`;
      div.appendChild(item);
    }

    container.appendChild(div);
  }
}

// --- Provider groups rendering ---
function renderProviderGroups(): void {
  const container = document.getElementById('provider-groups-container')!;
  container.innerHTML = '';

  if (providerGroups.length === 0) {
    container.innerHTML = '<div class="provider-empty">Нет провайдеров. Нажмите + чтобы добавить.</div>';
    return;
  }

  for (const group of providerGroups) {
    const div = document.createElement('div');
    div.className = `provider-group-card ${group.enabled ? '' : 'disabled'}`;
    div.innerHTML = `
      <div class="provider-group-header">
        <span class="provider-group-name">${group.name}</span>
        <div class="provider-group-actions">
          <button class="btn-icon btn-delete" data-delete-group="${group.id}" title="Удалить">&times;</button>
        </div>
      </div>
      <div class="provider-group-key">${maskKey(group.sharedApiKey)}</div>
      <div class="provider-group-models">
        ${group.modelConfigs.map(m => `
          <label class="provider-model-item">
            <input type="checkbox" data-group-id="${group.id}" data-model-id="${m.id}" ${m.enabled ? 'checked' : ''}>
            <span>${m.name}</span>
          </label>
        `).join('')}
      </div>
    `;
    container.appendChild(div);

    // Delete group handler
    div.querySelector(`[data-delete-group="${group.id}"]`)!.addEventListener('click', () => {
      providerGroups = providerGroups.filter(g => g.id !== group.id);
      saveAndRender();
    });

    // Model toggle handlers
    div.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const gId = cb.dataset.groupId!;
        const mId = cb.dataset.modelId!;
        const g = providerGroups.find(g => g.id === gId);
        if (g) {
          const m = g.modelConfigs.find(m => m.id === mId);
          if (m) m.enabled = cb.checked;
        }
        saveAndRender();
      });
    });
  }
}

function renderModelSelect(): void {
  const select = document.getElementById('ai-model-select') as HTMLSelectElement;
  const currentValue = select.value;
  select.innerHTML = '';

  const enabledModels: Array<{ groupName: string; model: ModelConfig; group: ProviderGroup }> = [];
  for (const group of providerGroups) {
    if (!group.enabled) continue;
    for (const model of group.modelConfigs) {
      if (model.enabled) enabledModels.push({ groupName: group.name, model, group });
    }
  }

  if (enabledModels.length === 0) {
    select.innerHTML = '<option value="">-- Нет провайдеров --</option>';
    return;
  }

  for (const { groupName, model } of enabledModels) {
    const opt = document.createElement('option');
    opt.value = model.id;
    opt.textContent = `${model.name} (${groupName})`;
    select.appendChild(opt);
  }

  // Restore selection
  if (currentValue && enabledModels.some(m => m.model.id === currentValue)) {
    select.value = currentValue;
  } else if (currentSettings.ai?.activeModelId && enabledModels.some(m => m.model.id === currentSettings.ai.activeModelId)) {
    select.value = currentSettings.ai.activeModelId;
  }
}

function saveAndRender(): void {
  renderProviderGroups();
  renderModelSelect();
  parent.postMessage({ pluginMessage: { type: 'save-providers', providerGroups } }, '*');
}

function maskKey(key: string): string {
  if (!key || key === 'not-required') return 'Не требуется';
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

// --- Add provider catalog ---
function renderProviderCatalog(): void {
  const container = document.getElementById('provider-catalog')!;
  container.innerHTML = '';

  for (const [category, configs] of Object.entries(providerCatalog)) {
    const catDiv = document.createElement('div');
    catDiv.className = 'catalog-category';
    catDiv.innerHTML = `<div class="catalog-category-name">${category}</div>`;

    for (const config of configs) {
      const btn = document.createElement('button');
      btn.className = 'catalog-item';
      btn.textContent = config.name;
      btn.title = config.description;
      btn.addEventListener('click', () => startAddProvider(config.provider, category));
      catDiv.appendChild(btn);
    }

    container.appendChild(catDiv);
  }
}

function startAddProvider(baseProviderId: string, categoryName: string): void {
  addingProviderId = baseProviderId;
  const form = document.getElementById('add-provider-form')!;
  form.style.display = 'block';

  (document.getElementById('new-provider-name') as HTMLInputElement).value = categoryName;
  (document.getElementById('new-provider-apikey') as HTMLInputElement).value = '';

  // Show/hide conditional fields
  document.getElementById('new-provider-folderid-field')!.style.display = baseProviderId === 'yandex' ? 'flex' : 'none';
  document.getElementById('new-provider-url-field')!.style.display = baseProviderId === 'lmstudio' ? 'flex' : 'none';

  // Show available models for this provider
  const modelsContainer = document.getElementById('new-provider-models')!;
  modelsContainer.innerHTML = '';
  const models = providerCatalog[categoryName] || [];
  const providerModels = models.filter(m => m.provider === baseProviderId);

  for (const m of providerModels) {
    const label = document.createElement('label');
    label.className = 'rule-item';
    label.innerHTML = `<input type="checkbox" data-new-model-id="${m.id}" checked><span>${m.name}</span>`;
    modelsContainer.appendChild(label);
  }
}

// Save new provider button
document.getElementById('btn-save-provider')!.addEventListener('click', () => {
  const name = (document.getElementById('new-provider-name') as HTMLInputElement).value.trim();
  const apiKey = (document.getElementById('new-provider-apikey') as HTMLInputElement).value.trim();
  const folderId = (document.getElementById('new-provider-folderid') as HTMLInputElement).value.trim();
  const customUrl = (document.getElementById('new-provider-url') as HTMLInputElement).value.trim();

  if (!name) { alert('Введите название'); return; }
  if (addingProviderId !== 'lmstudio' && !apiKey) { alert('Введите API-ключ'); return; }

  const selectedModels: string[] = [];
  document.querySelectorAll<HTMLInputElement>('[data-new-model-id]:checked').forEach(cb => {
    selectedModels.push(cb.dataset.newModelId!);
  });

  if (selectedModels.length === 0) { alert('Выберите хотя бы одну модель'); return; }

  const modelConfigs: ModelConfig[] = selectedModels.map(configId => ({
    id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    baseConfigId: configId,
    name: getModelName(configId),
    enabled: true,
  }));

  const newGroup: ProviderGroup = {
    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    baseProviderId: addingProviderId,
    sharedApiKey: addingProviderId === 'lmstudio' ? 'not-required' : apiKey,
    folderId: folderId || undefined,
    customUrl: customUrl || undefined,
    modelConfigs,
    enabled: true,
    createdAt: Date.now(),
  };

  providerGroups.push(newGroup);
  saveAndRender();

  // Close panel
  document.getElementById('add-provider-panel')!.style.display = 'none';
  document.getElementById('add-provider-form')!.style.display = 'none';
});

function getModelName(configId: string): string {
  for (const configs of Object.values(providerCatalog)) {
    const found = configs.find(c => c.id === configId);
    if (found) return found.name;
  }
  return configId;
}

// --- Add/Close provider panel ---
document.getElementById('btn-add-provider')!.addEventListener('click', () => {
  const panel = document.getElementById('add-provider-panel')!;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  document.getElementById('add-provider-form')!.style.display = 'none';
  renderProviderCatalog();
});

document.getElementById('btn-close-add-panel')!.addEventListener('click', () => {
  document.getElementById('add-provider-panel')!.style.display = 'none';
});

// --- Import/Export ---
document.getElementById('btn-export')!.addEventListener('click', () => {
  const activeModelId = (document.getElementById('ai-model-select') as HTMLSelectElement).value;
  const data = {
    version: 2.1,
    exportedAt: new Date().toISOString(),
    pluginVersion: '2.0.0',
    settings: { providerGroups, activeModelId },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tt-typographer-providers.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-import')!.addEventListener('click', () => {
  (document.getElementById('import-file-input') as HTMLInputElement).click();
});

document.getElementById('import-file-input')!.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string);
      // Support both UText full export and TT Typographer export
      const groups = data.settings?.providerGroups || data.providerGroups;
      const activeId = data.settings?.activeModelId || data.activeModelId || '';

      if (!Array.isArray(groups)) {
        alert('Неверный формат файла');
        return;
      }

      providerGroups = groups;
      if (activeId) {
        currentSettings.ai = currentSettings.ai || {};
        currentSettings.ai.activeModelId = activeId;
      }
      saveAndRender();
    } catch {
      alert('Ошибка чтения файла');
    }
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = '';
});

// --- Layout section handlers ---

// Balance toggle — show/hide sub-options
const balanceEnabledCb = document.getElementById('balance-enabled') as HTMLInputElement;
balanceEnabledCb.addEventListener('change', () => {
  document.getElementById('balance-options')!.style.display = balanceEnabledCb.checked ? 'flex' : 'none';
});

// Segmented control helper
function initSegmentedControl(containerId: string): void {
  const container = document.getElementById(containerId)!;
  container.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function getSegmentedValue(containerId: string): string {
  const active = document.querySelector<HTMLButtonElement>(`#${containerId} .seg-btn.active`);
  return active?.dataset.value || '';
}

function setSegmentedValue(containerId: string, value: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

initSegmentedControl('balance-method');
initSegmentedControl('balance-strategy');

// --- Collect settings ---
function collectSettings(): any {
  const locale = (document.getElementById('locale-select') as HTMLSelectElement).value;
  const enabledRules: Record<string, boolean> = {};

  document.querySelectorAll<HTMLInputElement>('[data-rule-id]').forEach(cb => {
    enabledRules[cb.dataset.ruleId!] = cb.checked;
  });

  const settings: any = { locale, enabledRules };

  // Balance settings
  const balanceEnabled = (document.getElementById('balance-enabled') as HTMLInputElement).checked;
  if (balanceEnabled) {
    const method = getSegmentedValue('balance-method') as 'container' | 'nbsp';
    const strategy = getSegmentedValue('balance-strategy') as 'balance' | 'pretty';
    settings.balance = { enabled: true, method, strategy };

    // If NBSP method selected, auto-enable the orphan rule
    if (method === 'nbsp') {
      settings.enabledRules['common/layout/orphan'] = true;
    }
  }

  // Chat Time Padding
  const chatTimePadding = (document.getElementById('chat-time-padding') as HTMLInputElement).checked;
  if (chatTimePadding) {
    settings.chatTimePadding = { enabled: true };
  }

  if (currentTab === 'ai') {
    settings.ai = {
      enabled: true,
      activeModelId: (document.getElementById('ai-model-select') as HTMLSelectElement).value,
      mode: (document.getElementById('ai-mode') as HTMLSelectElement).value,
      styleVariant: (document.getElementById('ai-style-variant') as HTMLSelectElement).value,
      customPrompt: (document.getElementById('ai-custom-prompt') as HTMLTextAreaElement).value,
    };
  }

  return settings;
}

// --- Preview rendering ---
function renderPreview(previews: Array<{ original: string; result: string; name: string }>): void {
  const section = document.getElementById('preview-section')!;
  const container = document.getElementById('preview-container')!;
  container.innerHTML = '';

  if (previews.length === 0) { section.style.display = 'none'; return; }

  section.style.display = 'block';

  for (const preview of previews) {
    const div = document.createElement('div');
    div.className = 'preview-item';

    const header = document.createElement('div');
    header.className = 'preview-item-header';
    header.textContent = preview.name;
    div.appendChild(header);

    if (preview.original === preview.result) {
      const row = document.createElement('div');
      row.className = 'preview-row no-change';
      row.textContent = 'Без изменений';
      div.appendChild(row);
    } else {
      const origRow = document.createElement('div');
      origRow.className = 'preview-row original';
      origRow.textContent = preview.original.substring(0, 200);
      div.appendChild(origRow);
      const resultRow = document.createElement('div');
      resultRow.className = 'preview-row result';
      resultRow.textContent = preview.result.substring(0, 200);
      div.appendChild(resultRow);
    }

    container.appendChild(div);
  }
}

// --- AI processing ---

/** Step 1: Request text nodes from the plugin main thread */
function requestAiProcessing(): void {
  const settings = collectSettings();
  if (!settings.ai?.activeModelId) {
    alert('Выберите модель');
    return;
  }

  const loading = document.getElementById('ai-loading')!;
  const applyBtn = document.getElementById('btn-apply') as HTMLButtonElement;
  loading.classList.add('active');
  applyBtn.disabled = true;

  // Ask main thread for text nodes — main will respond with 'ai-texts-data'
  parent.postMessage({ pluginMessage: { type: 'apply-ai', settings } }, '*');
}

/** Step 2: Process texts through AI (called when main sends text nodes) */
async function processTextsWithAi(
  texts: Array<{ nodeId: string; text: string; name: string }>,
  settings: any
): Promise<void> {
  const modelId = settings.ai?.activeModelId;
  if (!modelId) return;

  // Find the model and group from our local state
  let foundGroup: ProviderGroup | null = null;
  let foundModel: ModelConfig | null = null;
  for (const group of providerGroups) {
    const model = group.modelConfigs.find(m => m.id === modelId);
    if (model) { foundGroup = group; foundModel = model; break; }
  }

  if (!foundGroup || !foundModel) {
    alert('Модель не найдена. Проверьте настройки провайдеров.');
    hideLoading();
    return;
  }

  const locale = settings.locale === 'auto' ? 'en' : settings.locale;
  const aiConfig: AiConfig = {
    group: foundGroup,
    model: foundModel,
    mode: settings.ai.mode || 'typography',
    locale,
    styleVariant: settings.ai.styleVariant,
    customPrompt: settings.ai.customPrompt,
  };

  const results: Array<{ nodeId: string; newText: string }> = [];

  for (const item of texts) {
    try {
      const result = await processWithAi(item.text, aiConfig);
      if (result.error) {
        alert(`Ошибка AI для "${item.name}": ${result.error}`);
        hideLoading();
        return;
      }
      results.push({ nodeId: item.nodeId, newText: result.text });
    } catch (error) {
      alert(`Ошибка: ${error}`);
      hideLoading();
      return;
    }
  }

  // Step 3: Send processed texts back to main for applying to Figma nodes
  parent.postMessage({ pluginMessage: { type: 'apply-ai-results', results } }, '*');
}

function hideLoading(): void {
  document.getElementById('ai-loading')!.classList.remove('active');
  (document.getElementById('btn-apply') as HTMLButtonElement).disabled = false;
}

// --- Button handlers ---
document.getElementById('btn-apply')!.addEventListener('click', () => {
  if (currentTab === 'ai') {
    requestAiProcessing();
  } else {
    parent.postMessage({ pluginMessage: { type: 'apply-typography', settings: collectSettings() } }, '*');
  }
});

document.getElementById('btn-preview')!.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'request-preview', settings: collectSettings() } }, '*');
});

// --- Messages from plugin ---
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as IncomingMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'settings-data': {
      const data = msg as SettingsData;
      currentSettings = data.settings;
      currentRules = data.rules;
      providerGroups = data.providerGroups || [];
      providerCatalog = data.providerCatalog || {};

      renderRules(data.rules);
      renderProviderGroups();
      renderModelSelect();

      if (data.settings.locale) {
        (document.getElementById('locale-select') as HTMLSelectElement).value = data.settings.locale;
      }
      // Restore layout settings
      if (data.settings.chatTimePadding?.enabled) {
        (document.getElementById('chat-time-padding') as HTMLInputElement).checked = true;
      }
      if (data.settings.balance?.enabled) {
        (document.getElementById('balance-enabled') as HTMLInputElement).checked = true;
        document.getElementById('balance-options')!.style.display = 'flex';
        setSegmentedValue('balance-method', data.settings.balance.method || 'container');
        setSegmentedValue('balance-strategy', data.settings.balance.strategy || 'balance');
      }
      if (data.settings.ai) {
        const ai = data.settings.ai;
        if (ai.activeModelId) {
          (document.getElementById('ai-model-select') as HTMLSelectElement).value = ai.activeModelId;
        }
        (document.getElementById('ai-mode') as HTMLSelectElement).value = ai.mode || 'typography';
        if (ai.customPrompt) {
          (document.getElementById('ai-custom-prompt') as HTMLTextAreaElement).value = ai.customPrompt;
        }
        if (ai.styleVariant) {
          (document.getElementById('ai-style-variant') as HTMLSelectElement).value = ai.styleVariant;
        }
      }
      break;
    }

    case 'preview-data':
      renderPreview((msg as PreviewData).previews);
      break;

    case 'ai-texts-data': {
      // Step 2: Main sent us text nodes — process them via AI (fetch in iframe)
      const aiData = msg as AiTextsData;
      processTextsWithAi(aiData.texts, aiData.settings);
      break;
    }

    case 'ai-complete': {
      // Step 4: Main applied all AI results
      const complete = msg as AiComplete;
      hideLoading();
      const statusMsg = complete.changesCount > 0
        ? `AI обработал ${complete.changesCount} из ${complete.totalNodes} слоёв.`
        : 'AI не внёс изменений.';
      alert(statusMsg);
      break;
    }

    case 'ai-error': {
      const errMsg = msg as AiError;
      hideLoading();
      alert(errMsg.error);
      break;
    }
  }
};

// --- Initialize ---
parent.postMessage({ pluginMessage: { type: 'request-settings' } }, '*');
