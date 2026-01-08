/**
 * SkipLinks component provides keyboard-accessible skip navigation links
 * that allow users to bypass repetitive content and navigate directly
 * to main content areas.
 *
 * These links are visually hidden by default but become visible when focused,
 * making them accessible to keyboard and screen reader users.
 */

interface SkipLink {
  /** The ID of the target element (without the # prefix) */
  targetId: string;
  /** The text label for the skip link */
  label: string;
}

interface SkipLinksProps {
  /** Array of skip links to render */
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { targetId: 'main-content', label: 'Skip to main content' },
  { targetId: 'navigation', label: 'Skip to navigation' },
];

export function SkipLinks({ links = defaultLinks }: SkipLinksProps) {
  return (
    <nav aria-label="Skip links" className="skip-links">
      {links.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          className="
            sr-only
            focus:not-sr-only
            focus:fixed
            focus:top-4
            focus:left-4
            focus:z-[100]
            focus:px-4
            focus:py-3
            focus:bg-teal-600
            focus:text-white
            focus:font-semibold
            focus:rounded-lg
            focus:shadow-lg
            focus:outline-none
            focus:ring-2
            focus:ring-white
            focus:ring-offset-2
            focus:ring-offset-teal-600
          "
          onClick={(e) => {
            // Find the target element
            const target = document.getElementById(link.targetId);
            if (target) {
              e.preventDefault();
              // Set tabindex if not already focusable
              if (!target.hasAttribute('tabindex')) {
                target.setAttribute('tabindex', '-1');
              }
              target.focus();
              // Scroll into view
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * Utility component to mark a section as a skip link target.
 * Wraps content with proper ID and focus handling.
 *
 * @example
 * ```tsx
 * <SkipLinkTarget id="main-content">
 *   <main>...</main>
 * </SkipLinkTarget>
 * ```
 */
interface SkipLinkTargetProps {
  /** The ID that skip links will reference */
  id: string;
  /** The content to wrap */
  children: React.ReactNode;
  /** Optional HTML element type to render */
  as?: 'div' | 'main' | 'section' | 'nav';
  /** Additional CSS classes */
  className?: string;
}

export function SkipLinkTarget({
  id,
  children,
  as: Component = 'div',
  className = '',
}: SkipLinkTargetProps) {
  return (
    <Component
      id={id}
      tabIndex={-1}
      className={`outline-none focus:outline-none ${className}`}
    >
      {children}
    </Component>
  );
}
