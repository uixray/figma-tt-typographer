/**
 * Node-aware post-processing module for text layout operations.
 *
 * These functions require access to the Figma API (TextNode, SceneNode)
 * and therefore run in the sandbox (main thread), NOT inside text-only rules.
 *
 * Two features:
 * 1. Container Scale — binary search for optimal text block width (text-wrap: balance)
 * 2. Chat Time Padding — append NBSP to chat messages so text doesn't overlap the time stamp
 */

// ============================================================================
// Utilities
// ============================================================================

/** Check if a node is inside an instance (where resize is unsafe) */
export function isInsideInstance(node: SceneNode): boolean {
  let current: BaseNode | null = node.parent;
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if (current.type === 'INSTANCE') return true;
    current = current.parent;
  }
  return false;
}

/** Name-matching patterns for chat bubble components */
const CHAT_NAME_PATTERNS = /chat|bubble|message|msg|dialog/i;

/** Name-matching patterns for time elements */
const TIME_NAME_PATTERNS = /time|timestamp|date|sent|delivery|clock/i;

/** Content pattern for time text (e.g. "12:00", "9:45 PM") */
const TIME_CONTENT_PATTERN = /^\d{1,2}:\d{2}/;

/**
 * Walk up from a text node to find the nearest component/instance
 * that looks like a chat bubble.
 */
function findChatComponent(node: TextNode): SceneNode | null {
  let current: BaseNode | null = node.parent;

  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    const sceneNode = current as SceneNode;

    // Check if this is a component or instance
    if (
      sceneNode.type === 'COMPONENT' ||
      sceneNode.type === 'INSTANCE' ||
      sceneNode.type === 'COMPONENT_SET'
    ) {
      // Match by component name
      if (CHAT_NAME_PATTERNS.test(sceneNode.name)) {
        return sceneNode;
      }

      // Match by having a child named "time" (even if component name doesn't match)
      if ('children' in sceneNode) {
        const hasTimeChild = (sceneNode as FrameNode).children.some(
          child => TIME_NAME_PATTERNS.test(child.name)
        );
        if (hasTimeChild) return sceneNode;
      }
    }

    // Also check frames that might be the chat bubble container
    if (sceneNode.type === 'FRAME' && CHAT_NAME_PATTERNS.test(sceneNode.name)) {
      return sceneNode;
    }

    current = current.parent;
  }

  return null;
}

/**
 * Find the time element among siblings/children of a chat component.
 * Returns the node representing time (could be Text, Frame, or Instance).
 */
function findTimeElement(parent: SceneNode): SceneNode | null {
  if (!('children' in parent)) return null;

  const container = parent as FrameNode;

  for (const child of container.children) {
    // Match by name
    if (TIME_NAME_PATTERNS.test(child.name)) {
      return child;
    }

    // Match text nodes by content pattern (e.g. "12:00")
    if (child.type === 'TEXT') {
      const text = (child as TextNode).characters.trim();
      if (TIME_CONTENT_PATTERN.test(text)) {
        return child;
      }
    }

    // Recurse into frames/instances that might contain time
    // (but only 1 level deep to avoid false positives)
    if (
      ('children' in child) &&
      (child.type === 'FRAME' || child.type === 'INSTANCE' || child.type === 'GROUP')
    ) {
      const nested = child as FrameNode;
      for (const grandchild of nested.children) {
        if (TIME_NAME_PATTERNS.test(grandchild.name)) {
          return child; // Return the parent frame/instance — its width includes icon + text
        }
        if (grandchild.type === 'TEXT') {
          const text = (grandchild as TextNode).characters.trim();
          if (TIME_CONTENT_PATTERN.test(text)) {
            return child; // Return parent for full width
          }
        }
      }
    }
  }

  return null;
}

/**
 * Get the effective width of a node (works for Text, Frame, Instance, etc.)
 */
function getNodeWidth(node: SceneNode): number {
  return node.width;
}

/**
 * Estimate the width of a single space character for a given text node.
 * For most proportional fonts (Inter, Roboto, SF Pro, Helvetica, Arial),
 * a space is roughly 0.25 × fontSize.
 */
function getSpaceWidth(node: TextNode): number {
  // Handle mixed font sizes — use the first character's size
  const fontSize = typeof node.fontSize === 'number'
    ? node.fontSize
    : (node.getRangeFontSize(0, 1) as number) || 14;

  return fontSize * 0.15;
}

/**
 * Check if this text node is the "message" text in a chat bubble
 * (not the time, not a status label, etc.)
 * Heuristic: it's the text node with the longest content.
 */
function isMessageText(node: TextNode, chatComponent: SceneNode): boolean {
  if (!('children' in chatComponent)) return true;

  const container = chatComponent as FrameNode;
  let longestText = '';
  let longestNode: TextNode | null = null;

  function findLongestText(parent: SceneNode) {
    if (!('children' in parent)) return;
    for (const child of (parent as FrameNode).children) {
      if (child.type === 'TEXT') {
        const textNode = child as TextNode;
        if (textNode.characters.length > longestText.length) {
          longestText = textNode.characters;
          longestNode = textNode;
        }
      } else if ('children' in child) {
        findLongestText(child);
      }
    }
  }

  findLongestText(container);
  return longestNode?.id === node.id;
}

// ============================================================================
// Chat Time Padding
// ============================================================================

/**
 * Apply chat time padding to a text node if it's inside a chat bubble.
 *
 * Detects chat components, finds the time element, measures its width,
 * and appends the appropriate number of NBSP characters to the message text
 * so the time stamp doesn't overlap.
 *
 * @param node - The text node to process
 * @param typographedText - The text after typography rules have been applied
 * @returns Modified text with trailing NBSP, or null if not a chat bubble
 */
export function applyChatTimePadding(node: TextNode, typographedText: string): string | null {
  // Step 1: Find chat bubble component
  const chatComponent = findChatComponent(node);
  if (!chatComponent) return null;

  // Step 2: Verify this is the message text (not the time itself)
  if (!isMessageText(node, chatComponent)) return null;

  // Step 3: Find the time element
  const timeElement = findTimeElement(chatComponent);
  if (!timeElement) return null;

  // Step 4: Calculate NBSP count
  const timeWidth = getNodeWidth(timeElement);
  const spaceWidth = getSpaceWidth(node);

  // Add safety margin: include gap between text and time element
  // Typical chat UI has 4–12px gap. We use a small buffer.
  const safetyMargin = spaceWidth * 2; // ~2 extra spaces
  const totalWidth = timeWidth + safetyMargin;

  const nbspCount = Math.ceil(totalWidth / spaceWidth);

  if (nbspCount <= 0) return null;

  // Step 5: Strip existing trailing whitespace, append new NBSP padding
  const trimmed = typographedText.replace(/[\s\u00A0]+$/, '');
  const padding = '\u00A0'.repeat(nbspCount);

  return trimmed + padding;
}

// ============================================================================
// Container Scale (Text Balance)
// ============================================================================

/**
 * Apply text-wrap: balance by finding the minimum width that keeps the same line count.
 * Uses binary search for performance.
 *
 * @param node - The text node to balance
 * @returns true if the width was changed
 */
export function applyContainerBalance(node: TextNode): boolean {
  // Only works on fixed-width, auto-height text nodes
  if (node.textAutoResize !== 'HEIGHT') return false;

  // Skip nodes inside instances (resize breaks instance overrides)
  if (isInsideInstance(node)) return false;

  const originalWidth = node.width;
  const originalHeight = node.height;

  // Skip single-line text (nothing to balance)
  // Rough check: if height is close to one line, skip
  const fontSize = typeof node.fontSize === 'number'
    ? node.fontSize
    : (node.getRangeFontSize(0, 1) as number) || 14;
  const lineHeight = fontSize * 1.5; // approximate
  if (originalHeight <= lineHeight * 1.2) return false;

  // Binary search for minimum width that doesn't increase height
  const minWidth = Math.max(50, fontSize * 4); // reasonable minimum
  let lo = minWidth;
  let hi = originalWidth;
  let optimalWidth = originalWidth;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);

    // Resize and let Figma reflow
    node.resize(mid, node.height);

    if (node.height <= originalHeight) {
      // Same number of lines (or fewer) — try narrower
      optimalWidth = mid;
      hi = mid - 1;
    } else {
      // More lines — too narrow, go wider
      lo = mid + 1;
    }
  }

  // Apply the optimal width (round up to avoid sub-pixel issues)
  const finalWidth = Math.ceil(optimalWidth);
  node.resize(finalWidth, node.height);

  return finalWidth !== Math.ceil(originalWidth);
}
