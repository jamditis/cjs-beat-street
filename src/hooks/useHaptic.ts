/**
 * Haptic feedback utilities for mobile touch interactions
 * Provides tactile feedback on supported devices
 */

export type HapticPattern = 'tap' | 'doubleTap' | 'success' | 'warning' | 'error' | 'selection';

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,           // Short tap feedback
  doubleTap: [10, 50, 10],  // Double tap pattern
  success: [10, 100, 20],   // Success confirmation
  warning: [30, 50, 30],    // Warning feedback
  error: [50, 100, 50, 100, 50], // Error pattern
  selection: 5,      // Very light selection feedback
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback with a specific pattern
 */
export function triggerHaptic(pattern: HapticPattern = 'tap'): void {
  if (!isHapticSupported()) return;

  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
  } catch {
    // Silently fail if vibration is not allowed
  }
}

/**
 * Cancel any ongoing haptic feedback
 */
export function cancelHaptic(): void {
  if (!isHapticSupported()) return;

  try {
    navigator.vibrate(0);
  } catch {
    // Silently fail
  }
}

/**
 * Hook for using haptic feedback in React components
 */
export function useHaptic() {
  return {
    isSupported: isHapticSupported(),
    trigger: triggerHaptic,
    cancel: cancelHaptic,
    patterns: HAPTIC_PATTERNS,
  };
}

/**
 * HOC-style function to wrap click handlers with haptic feedback
 */
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  handler: T,
  pattern: HapticPattern = 'tap'
): T {
  return ((...args: unknown[]) => {
    triggerHaptic(pattern);
    return handler(...args);
  }) as T;
}
