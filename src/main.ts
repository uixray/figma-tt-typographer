import { applyTypography, getAllRules, getRulesForLocale } from './core/engine';
import { detectLocale } from './core/detector';
import type { TypographySettings, Locale } from './core/rule';
import { DEFAULT_SETTINGS } from './core/rule';
import { findTextNodes, loadFontsForNodes, applyTextPreservingStyles } from './utils/figma';
import { loadSettings, saveSettings } from './utils/storage';

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

type PluginMessage = ApplyTypographyMsg | ApplyAiMsg | RequestSettingsMsg | RequestPreviewMsg;

// --- Core logic ---

async function runTypography(settings: TypographySettings): Promise<void> {
  const selectedNodes = figma.currentPage.selection;
  if (selectedNodes.length === 0) {
    figma.closePlugin('Пожалуйста, выделите один или несколько слоёв, фреймов или групп.');
    return;
  }

  // Find all text nodes
  const textNodes: TextNode[] = [];
  for (const node of selectedNodes) {
    textNodes.push(...findTextNodes(node));
  }

  if (textNodes.length === 0) {
    figma.closePlugin('В выделенных объектах не найдено текстовых слоёв.');
    return;
  }

  // Load fonts (with proper deduplication)
  await loadFontsForNodes(textNodes);

  // Apply typography
  let changesCount = 0;
  for (const node of textNodes) {
    const originalText = node.characters;
    const typographedText = applyTypography(originalText, settings);

    if (originalText !== typographedText) {
      // Use style-preserving text replacement
      const changed = applyTextPreservingStyles(node, typographedText);
      if (changed) changesCount++;
    }
  }

  // Save settings for next time
  await saveSettings(settings);

  const message = changesCount > 0
    ? `Типографика применена к ${changesCount} текстовым слоям.`
    : 'Изменений не найдено. Текст уже в порядке!';
  figma.closePlugin(message);
}

/** Generate preview data (text before/after) for UI */
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

// --- Command handling ---

if (figma.command === 'open_settings') {
  figma.showUI(__html__, { width: 340, height: 520, title: 'TT Typographer' });

  figma.ui.onmessage = async (msg: PluginMessage) => {
    switch (msg.type) {
      case 'apply-typography':
        await runTypography(msg.settings);
        break;

      case 'request-settings': {
        const settings = await loadSettings();
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
        });
        break;
      }

      case 'request-preview': {
        const previews = generatePreview(msg.settings);
        figma.ui.postMessage({
          type: 'preview-data',
          previews,
        });
        break;
      }

      case 'apply-ai':
        // AI processing happens in the iframe (has network access)
        // The iframe sends the processed text back, and we apply it
        await runTypography(msg.settings);
        break;
    }
  };
} else {
  // Quick apply with saved or default settings
  (async () => {
    const settings = await loadSettings();
    await runTypography(settings);
  })();
}
