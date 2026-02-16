// src/utils/platform.ts
// Platform abstraction layer for browser APIs that need Capacitor plugin
// replacements when running as a native app.
//
// When Capacitor is added, update these functions to use:
//   - @capacitor/browser for openExternalUrl
//   - @capacitor/clipboard for copyToClipboard
//   - @capacitor/share for shareText

/**
 * Open a URL in an external browser/tab.
 * In Capacitor, replace with: Browser.open({ url })
 */
export const openExternalUrl = (url: string): void => {
  window.open(url, '_blank');
};

/**
 * Copy text to the clipboard.
 * In Capacitor, replace with: Clipboard.write({ string: text })
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Share text using the native share sheet.
 * In Capacitor, replace with: Share.share({ title, text })
 * Returns true if shared, false if fell back to copy.
 */
export const shareText = async (title: string, text: string): Promise<'shared' | 'copied' | 'failed'> => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return 'failed'; // User cancelled
      }
    }
  }

  // Fallback to clipboard
  const copied = await copyToClipboard(text);
  return copied ? 'copied' : 'failed';
};

/**
 * Check if native sharing is available.
 * In Capacitor, this should always return true.
 */
export const canNativeShare = (): boolean => {
  return typeof navigator !== 'undefined' && !!navigator.share;
};
