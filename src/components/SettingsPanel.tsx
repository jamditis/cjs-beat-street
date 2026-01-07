import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, LogOut, Settings } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  shareLocation: boolean;
  onLocationToggle: (share: boolean) => void;
  displayName: string;
  onSignOut: () => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  shareLocation,
  onLocationToggle,
  displayName,
  onSignOut,
}: SettingsPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key to close
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap: Tab cycles within modal
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Focus the close button on mount
      closeButtonRef.current?.focus();

      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  const handleSignOut = () => {
    onSignOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-panel-title"
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-paper rounded-xl max-w-sm w-full p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" />
                <h2
                  id="settings-panel-title"
                  className="font-display text-xl text-ink"
                >
                  Settings
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close settings"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            {/* User info */}
            <div className="bg-cream rounded-lg p-4 mb-6">
              <p className="text-sm text-ink/60 mb-1">Signed in as</p>
              <p className="font-semibold text-ink">{displayName}</p>
            </div>

            {/* Location sharing toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-ink">Location sharing</p>
                    <p className="text-sm text-ink/60">
                      Let other attendees see your location
                    </p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={shareLocation}
                  onClick={() => onLocationToggle(!shareLocation)}
                  className={`relative w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                    shareLocation ? 'bg-teal-600' : 'bg-ink/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      shareLocation ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                  <span className="sr-only">
                    {shareLocation ? 'Disable' : 'Enable'} location sharing
                  </span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-ink/10 my-6" />

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-lg border-2 border-ink/20 text-ink font-semibold hover:border-ink/40 hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-ink/40 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
