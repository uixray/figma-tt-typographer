import { applyTypography, getAllRules } from './core/engine';
import type { TypographySettings } from './core/rule';
import { findTextNodes, loadFontsForNodes, applyTextPreservingStyles } from './utils/figma';
import { loadSettings, saveSettings, loadProviderGroups, saveProviderGroups } from './utils/storage';
import { getProvidersByCategory } from './shared/providers';
import type { ProviderGroup } from './shared/provider-types';
import { applyChatTimePadding, applyContainerBalance, isInsideInstance } from './core/balance';

// --- Message types between main thread and UI ---

interface ApplyTypographyMsg {
  type: 'apply-typography';
  settings: TypographySettings;
}

interface ApplyAiMsg {
  type: 'apply-ai';
  settings: TypographySettings;
}

interface RequestSettingsMsg {
  type: 'request-settings';
}

interface RequestPreviewMsg {
  type: 'request-preview';
  settings: TypographySettings;
}

interface SaveProvidersMsg {
  type: 'save-providers';
  providerGroups: ProviderGroup[];
}

interface ApplyAiResultsMsg {
  type: 'apply-ai-results';
  results: Array<{ nodeId: string; newText: string }>;
}

type PluginMessage = ApplyTypographyMsg | ApplyAiMsg | RequestSettingsMsg | RequestPreviewMsg | SaveProvidersMsg | ApplyAiResultsMsg;

// --- Core logic ---

async function runTypography(settings: TypographySettings): Promise<void> {
  const selectedNodes = figma.currentPage.selection;
  if (selectedNodes.length === 0) {
    figma.closePlugin('Пожалуйста, выделите один или несколько слоёв, фреймов или групп.');
    return;
  }

  const textNodes: TextNode[] = [];
  for (const node of selectedNodes) {
    textNodes.push(...findTextNodes(node));
  }

  if (textNodes.length === 0) {
    figma.closePlugin('В выделенных объектах не найдено текстовых слоёв.');
    return;
  }

  await loadFontsForNodes(textNodes);

  let changesCount = 0;
  let balanceCount = 0;

  for (const node of textNodes) {
    const originalText = node.characters;
    let newText = applyTypography(originalText, settings);

    // Post-processing: Chat Time Padding
    // Appends NBSP to chat message text so time element doesn't overlap
    if (settings.chatTimePadding?.enabled) {
      const paddedText = applyChatTimePadding(node, newText);
      if (paddedText !== null) {
        newText = paddedText;
      }
    }

    // Apply text changes (typography rules + chat padding)
    if (originalText !== newText) {
      const changed = applyTextPreservingStyles(node, newText);
      if (changed) changesCount++;
    }

    // Post-processing: Container Scale (text-wrap: balance)
    // Resizes text block width to balance line lengths
    if (settings.balance?.enabled && settings.balance.method === 'container') {
      if (!isInsideInstance(node)) {
        const balanced = applyContainerBalance(node);
        if (balanced) balanceCount++;
      }
    }
  }

  await saveSettings(settings);

  // Build status message
  const parts: string[] = [];
  if (changesCount > 0) {
    parts.push(`типографика: ${changesCount} слоёв`);
  }
  if (balanceCount > 0) {
    parts.push(`баланс: ${balanceCount} слоёв`);
  }

  const message = parts.length > 0
    ? `Готово! ${parts.join(', ')}.`
    : 'Изменений не найдено. Текст уже в порядке!';
  figma.closePlugin(message);
}

function generatePreview(settings: TypographySettings): Array<{ original: string; result: string; name: string }> {
  const selectedNodes = figma.currentPage.selection;
  const textNodes: TextNode[] = [];
  for (const node of selectedNodes) {
    textNodes.push(...findTextNodes(node));
  }

  return textNodes.slice(0, 10).map(node => ({
    original: node.characters,
    result: applyTypography(node.characters, settings),
    name: node.name,
  }));
}

/** Build provider catalog for UI (grouped by category, minimal info) */
function buildProviderCatalog(): Record<string, Array<{ id: string; name: string; provider: string; description: string }>> {
  const byCategory = getProvidersByCategory();
  const catalog: Record<string, Array<{ id: string; name: string; provider: string; description: string }>> = {};
  for (const [category, configs] of Object.entries(byCategory)) {
    catalog[category] = configs.map(c => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      description: c.description,
    }));
  }
  return catalog;
}

// --- Command handling ---

if (figma.command === 'open_settings') {
  figma.showUI(__html__, { width: 360, height: 560, title: 'TT Typographer' });

  figma.ui.onmessage = async (msg: PluginMessage) => {
    switch (msg.type) {
      case 'apply-typography':
        await runTypography(msg.settings);
        break;

      case 'request-settings': {
        const settings = await loadSettings();
        const providerGroups = await loadProviderGroups();
        const rules = getAllRules();
        const rulesInfo = rules.map(r => ({
          id: r.id,
          name: r.name,
          locale: r.locale,
          group: r.group,
          enabled: settings.enabledRules[r.id] ?? r.enabled,
        }));
        figma.ui.postMessage({
          type: 'settings-data',
          settings,
          rules: rulesInfo,
          providerGroups,
          providerCatalog: buildProviderCatalog(),
        });
        break;
      }

      case 'request-preview': {
        const previews = generatePreview(msg.settings);
        figma.ui.postMessage({ type: 'preview-data', previews });
        break;
      }

      case 'apply-ai': {
        // AI processing happens in the iframe (has network access)
        // Step 1: Collect text nodes and send to UI for AI processing
        const aiNodes = figma.currentPage.selection;
        if (aiNodes.length === 0) {
          figma.ui.postMessage({ type: 'ai-error', error: 'Выделите текстовые слои.' });
          break;
        }
        const aiTextNodes: TextNode[] = [];
        for (const node of aiNodes) {
          aiTextNodes.push(...findTextNodes(node));
        }
        if (aiTextNodes.length === 0) {
          figma.ui.postMessage({ type: 'ai-error', error: 'В выделении нет текстовых слоёв.' });
          break;
        }
        // Load fonts in advance for when results come back
        await loadFontsForNodes(aiTextNodes);
        // Send texts to UI for AI processing
        const textsForAi = aiTextNodes.map(n => ({ nodeId: n.id, text: n.characters, name: n.name }));
        figma.ui.postMessage({
          type: 'ai-texts-data',
          texts: textsForAi,
          settings: msg.settings,
        });
        break;
      }

      case 'apply-ai-results': {
        // Step 3: Apply AI-processed texts back to Figma nodes
        const resultsMsg = msg as ApplyAiResultsMsg;
        let aiChanges = 0;
        for (const { nodeId, newText } of resultsMsg.results) {
          const node = figma.getNodeById(nodeId);
          if (node && node.type === 'TEXT') {
            const textNode = node as TextNode;
            if (textNode.characters !== newText) {
              // Ensure fonts are loaded for this node
              const fonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
              await Promise.all(fonts.map(f => figma.loadFontAsync(f)));
              const changed = applyTextPreservingStyles(textNode, newText);
              if (changed) aiChanges++;
            }
          }
        }
        await saveSettings(resultsMsg.results.length > 0 ? await loadSettings() : await loadSettings());
        figma.ui.postMessage({
          type: 'ai-complete',
          changesCount: aiChanges,
          totalNodes: resultsMsg.results.length,
        });
        break;
      }

      case 'save-providers':
        await saveProviderGroups(msg.providerGroups);
        break;
    }
  };
} else if (figma.command === 'apply_balance') {
  // Quick balance: apply Container Scale without opening UI
  (async () => {
    const settings = await loadSettings();
    settings.balance = { enabled: true, method: 'container', strategy: 'balance' };
    await runTypography(settings);
  })();
} else {
  // Quick apply with saved or default settings
  (async () => {
    const settings = await loadSettings();
    await runTypography(settings);
  })();
}
