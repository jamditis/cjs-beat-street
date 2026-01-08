import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, LogOut, Settings, Building2, Award, User, BarChart3 } from 'lucide-react';
import { VenueId } from '../types/venue';
import { VenueSelector, getVenueDisplayName } from './VenueSelector';
import { getPlayerAppearance, setPlayerAppearance, getAvailablePresets } from '../utils/playerCustomization';
import { eventBus } from '../lib/EventBus';
import { useAnalyticsConsent } from '../hooks/useAnalytics';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  shareLocation: boolean;
  onLocationToggle: (share: boolean) => void;
  displayName: string;
  onSignOut: () => void;
  currentVenue?: VenueId;
  onVenueChange?: (venueId: VenueId) => void;
  totalBadges?: number;
  onViewBadges?: () => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  shareLocation,
  onLocationToggle,
  displayName,
  onSignOut,
  currentVenue,
  onVenueChange,
  totalBadges,
  onViewBadges,
}: SettingsPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [showVenueChange, setShowVenueChange] = useState(false);
  const [playerAppearance, setPlayerAppearanceState] = useState(() => getPlayerAppearance());
  const availablePresets = getAvailablePresets();
  const { analyticsEnabled, setAnalyticsEnabled } = useAnalyticsConsent();

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
    } else {
      // Reset venue change state when panel closes
      setShowVenueChange(false);
    }
  }, [isOpen, handleKeyDown]);

  const handleSignOut = () => {
    onSignOut();
    onClose();
  };

  const handleAppearanceChange = (preset: string) => {
    setPlayerAppearanceState(preset as typeof playerAppearance);
    setPlayerAppearance(preset as typeof playerAppearance);

    // Notify the game to reload player sprites
    eventBus.emit('player-appearance-changed', { preset });
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

            {/* Analytics toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-ink">Usage analytics</p>
                    <p className="text-sm text-ink/60">
                      Help improve the app with anonymous usage data
                    </p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={analyticsEnabled}
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`relative w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                    analyticsEnabled ? 'bg-teal-600' : 'bg-ink/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      analyticsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                  <span className="sr-only">
                    {analyticsEnabled ? 'Disable' : 'Enable'} usage analytics
                  </span>
                </button>
              </div>
              <p className="text-xs text-ink/50 mt-2 ml-8">
                No personal information is collected. Analytics help sponsors understand engagement.
              </p>
            </div>

            {/* Player Appearance */}
            <div className="border-t border-ink/10 pt-4 mt-4">
              <div className="flex items-start gap-3 mb-3">
                <User className="w-5 h-5 text-teal-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-ink">Player appearance</p>
                  <p className="text-sm text-ink/60 mb-3">
                    Choose your character's outfit color
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {availablePresets.map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => handleAppearanceChange(preset.key)}
                        className={`relative p-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                          playerAppearance === preset.key
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-ink/10 hover:border-ink/30 hover:bg-cream'
                        }`}
                        aria-label={`Select ${preset.label} appearance`}
                        aria-pressed={playerAppearance === preset.key}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-ink/10"
                            style={{ backgroundColor: preset.colors.shirtColor }}
                          />
                          <span className="text-xs font-medium text-ink">
                            {preset.label}
                          </span>
                        </div>
                        {playerAppearance === preset.key && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-teal-600 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-ink/50 mt-2">
                    Changes take effect on next map load
                  </p>
                </div>
              </div>
            </div>

            {/* My Badges Section */}
            {onViewBadges && (
              <div className="border-t border-ink/10 pt-4 mt-4">
                <button
                  onClick={() => {
                    onViewBadges();
                    onClose();
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <Award className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-ink">My Badges</p>
                    <p className="text-sm text-ink/60">
                      {totalBadges !== undefined ? `${totalBadges} badges earned` : 'View your achievements'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                    {totalBadges !== undefined ? totalBadges : '0'}
                  </div>
                </button>
              </div>
            )}

            {/* Venue Selection */}
            {currentVenue && onVenueChange && (
              <div className="border-t border-ink/10 pt-4 mt-4">
                <div className="flex items-start gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-ink">Conference venue</p>
                    {!showVenueChange ? (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-ink/60">
                          {getVenueDisplayName(currentVenue)}
                        </span>
                        <button
                          onClick={() => setShowVenueChange(true)}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium focus:outline-none focus:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <VenueSelector
                          currentVenue={currentVenue}
                          onSelectVenue={(venueId) => {
                            onVenueChange(venueId);
                            setShowVenueChange(false);
                          }}
                          compact={true}
                        />
                        <button
                          onClick={() => setShowVenueChange(false)}
                          className="mt-2 text-sm text-ink/50 hover:text-ink/70 focus:outline-none focus:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-ink/50 mt-2">
                      Changing venues will update the map and reset your location.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
