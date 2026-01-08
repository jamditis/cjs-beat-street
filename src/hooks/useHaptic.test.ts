/**
 * Tests for useHaptic hook and haptic utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isHapticSupported,
  triggerHaptic,
  cancelHaptic,
  useHaptic,
  withHaptic,
  HapticPattern,
} from './useHaptic';
import { renderHook } from '@testing-library/react';

describe('Haptic Utilities', () => {
  const mockVibrate = vi.fn();

  beforeEach(() => {
    // Reset mock
    mockVibrate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isHapticSupported()', () => {
    it('should return true when navigator.vibrate exists', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });

      expect(isHapticSupported()).toBe(true);
    });

    it('should return false when navigator.vibrate does not exist', () => {
      // Store original and delete vibrate property
      const originalVibrate = navigator.vibrate;
      // @ts-expect-error - deleting for test purposes
      delete navigator.vibrate;

      expect(isHapticSupported()).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('triggerHaptic()', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });

    it('should call navigator.vibrate with tap pattern by default', () => {
      triggerHaptic();

      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('should call navigator.vibrate with correct pattern for "tap"', () => {
      triggerHaptic('tap');

      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('should call navigator.vibrate with correct pattern for "doubleTap"', () => {
      triggerHaptic('doubleTap');

      expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10]);
    });

    it('should call navigator.vibrate with correct pattern for "success"', () => {
      triggerHaptic('success');

      expect(mockVibrate).toHaveBeenCalledWith([10, 100, 20]);
    });

    it('should call navigator.vibrate with correct pattern for "warning"', () => {
      triggerHaptic('warning');

      expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30]);
    });

    it('should call navigator.vibrate with correct pattern for "error"', () => {
      triggerHaptic('error');

      expect(mockVibrate).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
    });

    it('should call navigator.vibrate with correct pattern for "selection"', () => {
      triggerHaptic('selection');

      expect(mockVibrate).toHaveBeenCalledWith(5);
    });

    it('should not throw when vibration is not supported', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => triggerHaptic('tap')).not.toThrow();
    });

    it('should handle errors gracefully', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: () => {
          throw new Error('Vibration not allowed');
        },
        writable: true,
        configurable: true,
      });

      expect(() => triggerHaptic('tap')).not.toThrow();
    });
  });

  describe('cancelHaptic()', () => {
    it('should call navigator.vibrate with 0 to cancel', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });

      cancelHaptic();

      expect(mockVibrate).toHaveBeenCalledWith(0);
    });

    it('should not throw when vibration is not supported', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => cancelHaptic()).not.toThrow();
    });

    it('should handle errors gracefully', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: () => {
          throw new Error('Vibration not allowed');
        },
        writable: true,
        configurable: true,
      });

      expect(() => cancelHaptic()).not.toThrow();
    });
  });

  describe('useHaptic()', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });

    it('should return isSupported as true when vibration is available', () => {
      const { result } = renderHook(() => useHaptic());

      expect(result.current.isSupported).toBe(true);
    });

    it('should return isSupported as false when vibration is not available', () => {
      // Store original and delete vibrate property
      const originalVibrate = navigator.vibrate;
      // @ts-expect-error - deleting for test purposes
      delete navigator.vibrate;

      const { result } = renderHook(() => useHaptic());

      expect(result.current.isSupported).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        writable: true,
        configurable: true,
      });
    });

    it('should return trigger function', () => {
      const { result } = renderHook(() => useHaptic());

      expect(typeof result.current.trigger).toBe('function');
    });

    it('should return cancel function', () => {
      const { result } = renderHook(() => useHaptic());

      expect(typeof result.current.cancel).toBe('function');
    });

    it('should return patterns object', () => {
      const { result } = renderHook(() => useHaptic());

      expect(result.current.patterns).toHaveProperty('tap');
      expect(result.current.patterns).toHaveProperty('doubleTap');
      expect(result.current.patterns).toHaveProperty('success');
      expect(result.current.patterns).toHaveProperty('warning');
      expect(result.current.patterns).toHaveProperty('error');
      expect(result.current.patterns).toHaveProperty('selection');
    });

    it('should allow triggering haptic via returned function', () => {
      const { result } = renderHook(() => useHaptic());

      result.current.trigger('success');

      expect(mockVibrate).toHaveBeenCalledWith([10, 100, 20]);
    });

    it('should allow canceling haptic via returned function', () => {
      const { result } = renderHook(() => useHaptic());

      result.current.cancel();

      expect(mockVibrate).toHaveBeenCalledWith(0);
    });
  });

  describe('withHaptic()', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });

    it('should wrap a handler function with haptic feedback', () => {
      const originalHandler = vi.fn();
      const wrappedHandler = withHaptic(originalHandler);

      wrappedHandler();

      expect(mockVibrate).toHaveBeenCalledWith(10); // Default tap pattern
      expect(originalHandler).toHaveBeenCalled();
    });

    it('should pass arguments through to the original handler', () => {
      const originalHandler = vi.fn();
      const wrappedHandler = withHaptic(originalHandler);

      wrappedHandler('arg1', 'arg2');

      expect(originalHandler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should return the result of the original handler', () => {
      const originalHandler = vi.fn().mockReturnValue('result');
      const wrappedHandler = withHaptic(originalHandler);

      const result = wrappedHandler();

      expect(result).toBe('result');
    });

    it('should use specified haptic pattern', () => {
      const originalHandler = vi.fn();
      const wrappedHandler = withHaptic(originalHandler, 'success');

      wrappedHandler();

      expect(mockVibrate).toHaveBeenCalledWith([10, 100, 20]);
    });

    it('should trigger haptic before calling the handler', () => {
      const callOrder: string[] = [];

      Object.defineProperty(navigator, 'vibrate', {
        value: () => {
          callOrder.push('vibrate');
        },
        writable: true,
        configurable: true,
      });

      const originalHandler = () => {
        callOrder.push('handler');
      };
      const wrappedHandler = withHaptic(originalHandler);

      wrappedHandler();

      expect(callOrder).toEqual(['vibrate', 'handler']);
    });
  });

  describe('HapticPattern type coverage', () => {
    it('should accept all valid haptic patterns', () => {
      const patterns: HapticPattern[] = [
        'tap',
        'doubleTap',
        'success',
        'warning',
        'error',
        'selection',
      ];

      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });

      patterns.forEach((pattern) => {
        mockVibrate.mockClear();
        expect(() => triggerHaptic(pattern)).not.toThrow();
        expect(mockVibrate).toHaveBeenCalled();
      });
    });
  });
});
