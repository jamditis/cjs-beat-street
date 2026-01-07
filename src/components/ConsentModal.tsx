import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ConsentModalProps {
  onConsent: (shareLocation: boolean) => void;
}

export function ConsentModal({ onConsent }: ConsentModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const lastButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key to decline
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onConsent(false);
        return;
      }

      // Focus trap: Tab cycles between buttons
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [onConsent]
  );

  useEffect(() => {
    // Focus the first button on mount
    firstButtonRef.current?.focus();

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      aria-describedby="consent-modal-description"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-paper rounded-xl max-w-md p-6 shadow-2xl"
      >
        <h2
          id="consent-modal-title"
          className="font-display text-2xl text-ink mb-4"
        >
          Location sharing
        </h2>

        <p id="consent-modal-description" className="text-ink/80 mb-6">
          Would you like other attendees to see your location in Beat Street?
          This helps with networking and finding colleagues.
        </p>

        <div className="space-y-3">
          {/* Equal prominence buttons - GDPR compliant */}
          <button
            ref={firstButtonRef}
            onClick={() => onConsent(true)}
            className="w-full py-3 rounded-lg bg-teal-600 text-white font-semibold
                       hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            Yes, share my location
          </button>

          <button
            ref={lastButtonRef}
            onClick={() => onConsent(false)}
            className="w-full py-3 rounded-lg bg-cream text-ink font-semibold
                       border-2 border-ink/20 hover:border-ink/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ink/40 focus:ring-offset-2"
          >
            No, keep my location private
          </button>
        </div>

        <p className="text-xs text-ink/60 mt-4 text-center">
          You can change this anytime in Settings.
          All features work without location sharing.
        </p>
      </motion.div>
    </motion.div>
  );
}
