/** Recursively find all TEXT nodes within a node tree */
export function findTextNodes(node: SceneNode): TextNode[] {
  const textNodes: TextNode[] = [];

  function walk(n: SceneNode) {
    if (n.type === 'TEXT') {
      textNodes.push(n);
    } else if ('children' in n) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return textNodes;
}

/**
 * Load all fonts used in text nodes.
 * FIX for Б1: deduplicate by font family + style, not by Promise object.
 */
export async function loadFontsForNodes(textNodes: TextNode[]): Promise<void> {
  const fontMap = new Map<string, Promise<void>>();

  for (const node of textNodes) {
    const fonts = node.getRangeAllFontNames(0, node.characters.length);
    for (const font of fonts) {
      const key = `${font.family}::${font.style}`;
      if (!fontMap.has(key)) {
        fontMap.set(key, figma.loadFontAsync(font));
      }
    }
  }

  await Promise.all(fontMap.values());
}

/**
 * Apply text changes while preserving formatting (bold, italic, color, etc.).
 * FIX for Б2: Instead of replacing node.characters directly (which resets all
 * formatting to the first character's style), we use deleteCharacters and
 * insertCharacters to preserve per-character formatting.
 *
 * This approach works for replacements that don't change character positions
 * drastically. For complex changes (different length), we apply character-by-character.
 */
export function applyTextPreservingStyles(node: TextNode, newText: string): boolean {
  const oldText = node.characters;
  if (oldText === newText) return false;

  // If lengths are the same, we can replace character by character
  // preserving all formatting
  if (oldText.length === newText.length) {
    for (let i = 0; i < oldText.length; i++) {
      if (oldText[i] !== newText[i]) {
        node.deleteCharacters(i, i + 1);
        node.insertCharacters(i, newText[i]);
      }
    }
    return true;
  }

  // For different lengths, we need a more careful approach.
  // Find the common prefix and suffix, then replace the middle section.
  let prefixLen = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const oldMiddleStart = prefixLen;
  const oldMiddleEnd = oldText.length - suffixLen;
  const newMiddle = newText.substring(prefixLen, newText.length - suffixLen);

  // Delete the old middle section
  if (oldMiddleEnd > oldMiddleStart) {
    node.deleteCharacters(oldMiddleStart, oldMiddleEnd);
  }

  // Insert the new middle section
  if (newMiddle.length > 0) {
    node.insertCharacters(oldMiddleStart, newMiddle);
  }

  return true;
}
