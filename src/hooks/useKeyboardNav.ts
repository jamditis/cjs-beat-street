import { useEffect, useCallback, useRef, RefObject } from 'react';

export interface KeyboardNavOptions {
  /** Callback when Escape key is pressed */
  onEscape?: () => void;
  /** Callback when Arrow Up key is pressed */
  onArrowUp?: () => void;
  /** Callback when Arrow Down key is pressed */
  onArrowDown?: () => void;
  /** Callback when Arrow Left key is pressed */
  onArrowLeft?: () => void;
  /** Callback when Arrow Right key is pressed */
  onArrowRight?: () => void;
  /** Callback when Enter key is pressed */
  onEnter?: () => void;
  /** Callback when Space key is pressed */
  onSpace?: () => void;
  /** Callback when Home key is pressed */
  onHome?: () => void;
  /** Callback when End key is pressed */
  onEnd?: () => void;
  /** Enable focus trap within the container */
  trapFocus?: boolean;
  /** Reference to the container element for focus trapping */
  containerRef?: RefObject<HTMLElement | null>;
  /** Whether the keyboard navigation is active */
  enabled?: boolean;
}

/**
 * Hook for managing keyboard navigation in interactive components.
 * Provides consistent keyboard support for modals, panels, lists, and other interactive elements.
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *
 *   useKeyboardNav({
 *     onEscape: onClose,
 *     trapFocus: true,
 *     containerRef: modalRef,
 *     enabled: isOpen,
 *   });
 *
 *   return <div ref={modalRef}>...</div>;
 * }
 * ```
 */
export function useKeyboardNav({
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onSpace,
  onHome,
  onEnd,
  trapFocus = false,
  containerRef,
  enabled = true,
}: KeyboardNavOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within a container
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = container.querySelectorAll<HTMLElement>(focusableSelectors);
    return Array.from(elements).filter(
      (el) => el.offsetParent !== null // Only visible elements
    );
  }, []);

  // Handle focus trap
  const handleFocusTrap = useCallback(
    (event: KeyboardEvent) => {
      if (!trapFocus || !containerRef?.current) return;

      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift+Tab: if at first element, go to last
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if at last element, go to first
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [trapFocus, containerRef, getFocusableElements]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle focus trap first
      handleFocusTrap(event);

      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            event.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            event.preventDefault();
            onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            event.preventDefault();
            onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            event.preventDefault();
            onArrowRight();
          }
          break;
        case 'Enter':
          if (onEnter) {
            event.preventDefault();
            onEnter();
          }
          break;
        case ' ':
          if (onSpace) {
            event.preventDefault();
            onSpace();
          }
          break;
        case 'Home':
          if (onHome) {
            event.preventDefault();
            onHome();
          }
          break;
        case 'End':
          if (onEnd) {
            event.preventDefault();
            onEnd();
          }
          break;
      }
    },
    [
      handleFocusTrap,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onEnter,
      onSpace,
      onHome,
      onEnd,
    ]
  );

  // Set up event listeners and manage focus
  useEffect(() => {
    if (!enabled) return;

    // Store the previously focused element
    if (trapFocus && containerRef?.current) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the first focusable element in the container
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus when unmounting (if focus was trapped)
      if (trapFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [enabled, trapFocus, containerRef, handleKeyDown, getFocusableElements]);

  // Return utility functions for manual control
  return {
    /** Focus the first focusable element in the container */
    focusFirst: useCallback(() => {
      if (containerRef?.current) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, [containerRef, getFocusableElements]),

    /** Focus the last focusable element in the container */
    focusLast: useCallback(() => {
      if (containerRef?.current) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          focusableElements[focusableElements.length - 1].focus();
        }
      }
    }, [containerRef, getFocusableElements]),

    /** Get all focusable elements in the container */
    getFocusableElements: useCallback(() => {
      if (containerRef?.current) {
        return getFocusableElements(containerRef.current);
      }
      return [];
    }, [containerRef, getFocusableElements]),
  };
}
