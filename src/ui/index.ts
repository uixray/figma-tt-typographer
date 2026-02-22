// UI logic for TT Typographer plugin

interface RuleInfo {
  id: string;
  name: Record<string, string>;
  locale: string;
  group: string;
  enabled: boolean;
}

interface SettingsData {
  type: 'settings-data';
  settings: any;
  rules: RuleInfo[];
}

interface PreviewData {
  type: 'preview-data';
  previews: Array<{ original: string; result: string; name: string }>;
}

type IncomingMessage = SettingsData | PreviewData;

// --- State ---
let currentRules: RuleInfo[] = [];
let currentSettings: any = {};
let currentTab = 'rules';

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
  const styleField = document.getElementById('style-variant-field')!;
  const customField = document.getElementById('custom-prompt-field')!;
  styleField.style.display = mode === 'style' ? 'flex' : 'none';
  customField.style.display = mode === 'custom' ? 'flex' : 'none';
});

// --- Rules rendering ---
function renderRules(rules: RuleInfo[]): void {
  const container = document.getElementById('rules-container')!;
  container.innerHTML = '';

  // Group by group name
  const groups = new Map<string, RuleInfo[]>();
  for (const rule of rules) {
    const group = rule.group;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(rule);
  }

  const groupNames: Record<string, string> = {
    case: 'Регистр',
    yo: 'Ёфикация',
    quotes: 'Кавычки',
    dashes: 'Тире',
    spaces: 'Пробелы',
    numbers: 'Числа',
    currency: 'Валюта',
    punctuation: 'Пунктуация',
    special: 'Спецсимволы',
    width: 'Ширина символов',
  };

  for (const [group, groupRules] of groups) {
    const div = document.createElement('div');
    div.className = 'rule-group';

    const header = document.createElement('div');
    header.className = 'rule-group-header';
    header.innerHTML = `
      <span>${groupNames[group] || group}</span>
      <span class="toggle-all" data-group="${group}">вкл/выкл</span>
    `;
    div.appendChild(header);

    // Toggle all in group
    header.querySelector('.toggle-all')!.addEventListener('click', (e) => {
      e.stopPropagation();
      const checkboxes = div.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => { cb.checked = !allChecked; });
    });

    for (const rule of groupRules) {
      const item = document.createElement('label');
      item.className = 'rule-item';
      const name = rule.name.ru || rule.name.en || rule.id;
      item.innerHTML = `
        <input type="checkbox" data-rule-id="${rule.id}" ${rule.enabled ? 'checked' : ''}>
        <span>${name}</span>
      `;
      div.appendChild(item);
    }

    container.appendChild(div);
  }
}

// --- Collect settings ---
function collectSettings(): any {
  const locale = (document.getElementById('locale-select') as HTMLSelectElement).value;
  const enabledRules: Record<string, boolean> = {};

  document.querySelectorAll<HTMLInputElement>('[data-rule-id]').forEach(cb => {
    enabledRules[cb.dataset.ruleId!] = cb.checked;
  });

  const settings: any = {
    locale,
    enabledRules,
  };

  // AI settings
  if (currentTab === 'ai') {
    settings.ai = {
      enabled: true,
      provider: (document.getElementById('ai-provider') as HTMLSelectElement).value,
      apiKey: (document.getElementById('ai-apikey') as HTMLInputElement).value,
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

  if (previews.length === 0) {
    section.style.display = 'none';
    return;
  }

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

// --- AI processing (from iframe with network access) ---
async function processAi(): Promise<void> {
  const settings = collectSettings();
  if (!settings.ai?.apiKey) {
    alert('Введите API-ключ');
    return;
  }

  const loading = document.getElementById('ai-loading')!;
  const applyBtn = document.getElementById('btn-apply') as HTMLButtonElement;
  loading.classList.add('active');
  applyBtn.disabled = true;

  try {
    // Request text from plugin for AI processing
    parent.postMessage({
      pluginMessage: {
        type: 'apply-ai',
        settings,
      }
    }, '*');
  } catch (error) {
    alert(`Ошибка AI: ${error}`);
  } finally {
    loading.classList.remove('active');
    applyBtn.disabled = false;
  }
}

// --- Button handlers ---
document.getElementById('btn-apply')!.addEventListener('click', () => {
  if (currentTab === 'ai') {
    processAi();
  } else {
    const settings = collectSettings();
    parent.postMessage({
      pluginMessage: {
        type: 'apply-typography',
        settings,
      }
    }, '*');
  }
});

document.getElementById('btn-preview')!.addEventListener('click', () => {
  const settings = collectSettings();
  parent.postMessage({
    pluginMessage: {
      type: 'request-preview',
      settings,
    }
  }, '*');
});

// --- Messages from plugin ---
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as IncomingMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'settings-data':
      currentSettings = msg.settings;
      currentRules = msg.rules;
      renderRules(msg.rules);
      if (msg.settings.locale) {
        (document.getElementById('locale-select') as HTMLSelectElement).value = msg.settings.locale;
      }
      if (msg.settings.ai) {
        (document.getElementById('ai-provider') as HTMLSelectElement).value = msg.settings.ai.provider || 'anthropic';
        (document.getElementById('ai-apikey') as HTMLInputElement).value = msg.settings.ai.apiKey || '';
        (document.getElementById('ai-mode') as HTMLSelectElement).value = msg.settings.ai.mode || 'typography';
      }
      break;

    case 'preview-data':
      renderPreview(msg.previews);
      break;
  }
};

// --- Initialize ---
parent.postMessage({ pluginMessage: { type: 'request-settings' } }, '*');
