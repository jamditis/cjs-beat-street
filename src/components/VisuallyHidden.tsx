import { ReactNode, HTMLAttributes } from 'react';

interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  /** The content to be hidden visually but accessible to screen readers */
  children: ReactNode;
  /**
   * If true, the element becomes visible when focused.
   * Useful for skip links and other elements that should appear on focus.
   */
  focusable?: boolean;
}

/**
 * VisuallyHidden component hides content visually while keeping it
 * accessible to screen readers and other assistive technologies.
 *
 * This is useful for:
 * - Adding descriptive text to icon-only buttons
 * - Providing context for screen reader users
 * - Creating skip links that appear on focus
 *
 * @example
 * ```tsx
 * // Hidden text for icon button
 * <button>
 *   <SearchIcon />
 *   <VisuallyHidden>Search</VisuallyHidden>
 * </button>
 *
 * // Skip link that appears on focus
 * <VisuallyHidden focusable>
 *   <a href="#main-content">Skip to main content</a>
 * </VisuallyHidden>
 * ```
 */
export function VisuallyHidden({
  children,
  focusable = false,
  className = '',
  ...props
}: VisuallyHiddenProps) {
  const baseStyles = `
    absolute
    w-px
    h-px
    p-0
    -m-px
    overflow-hidden
    whitespace-nowrap
    border-0
  `.replace(/\s+/g, ' ').trim();

  const focusableStyles = focusable
    ? `
        focus-within:static
        focus-within:w-auto
        focus-within:h-auto
        focus-within:m-0
        focus-within:overflow-visible
        focus-within:whitespace-normal
      `.replace(/\s+/g, ' ').trim()
    : '';

  // Use clip-path instead of clip (deprecated)
  const clipStyles: React.CSSProperties = {
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
  };

  // When focusable and focused, remove clip
  const focusableClipStyles: React.CSSProperties = focusable
    ? {}
    : clipStyles;

  return (
    <span
      className={`${baseStyles} ${focusableStyles} ${className}`}
      style={focusableClipStyles}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * A live region component that announces dynamic content changes
 * to screen reader users.
 *
 * @example
 * ```tsx
 * <LiveRegion politeness="polite">
 *   {notificationMessage}
 * </LiveRegion>
 * ```
 */
interface LiveRegionProps {
  children: ReactNode;
  /**
   * The politeness level for announcements:
   * - 'polite': Waits until user is idle (default)
   * - 'assertive': Interrupts immediately
   * - 'off': Disables announcements
   */
  politeness?: 'polite' | 'assertive' | 'off';
  /** Whether to announce all changes, not just additions */
  atomic?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  className = '',
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * A visually hidden live region for screen reader announcements.
 * Content updates are announced but not visible on screen.
 *
 * @example
 * ```tsx
 * <Announcer>
 *   {`${newNotifications} new notifications`}
 * </Announcer>
 * ```
 */
export function Announcer({
  children,
  politeness = 'polite',
}: {
  children: ReactNode;
  politeness?: 'polite' | 'assertive';
}) {
  return (
    <VisuallyHidden>
      <LiveRegion politeness={politeness}>
        {children}
      </LiveRegion>
    </VisuallyHidden>
  );
}
