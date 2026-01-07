import { useEffect, useState } from 'react';
import { eventBus } from '../lib/EventBus';
import { useAttendees } from '../hooks/useAttendees';

interface AttendeeProfileModalProps {
  onClose?: () => void;
}

export function AttendeeProfileModal({ onClose }: AttendeeProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedAttendee, loading, error, selectAttendee, waveAt, findOnMap } = useAttendees({
    autoFetch: true,
  });

  // Listen for attendee clicks
  useEffect(() => {
    const handleClick = () => {
      setIsOpen(true);
    };

    const unsubscribe = eventBus.on('attendee-clicked', handleClick);
    return unsubscribe;
  }, []);

  // Listen for attendee selection events
  useEffect(() => {
    const handleSelection = () => {
      setIsOpen(true);
    };

    const unsubscribe = eventBus.on('attendee-selected', handleSelection);
    return unsubscribe;
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    selectAttendee(null);
    if (onClose) onClose();
  };

  const handleWave = async () => {
    if (selectedAttendee) {
      const success = await waveAt(selectedAttendee.uid);
      if (success) {
        // Show success feedback
        alert(`Wave sent to ${selectedAttendee.displayName}!`);
      }
    }
  };

  const handleFindOnMap = () => {
    if (selectedAttendee) {
      findOnMap(selectedAttendee.uid);
      handleClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'away':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-paper rounded-xl shadow-2xl border-4 border-teal-600 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-teal-600 p-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-cream">Attendee Profile</h2>
          <button
            onClick={handleClose}
            className="text-cream hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
              {error}
            </div>
          )}

          {selectedAttendee && !loading && (
            <div className="space-y-6">
              {/* Avatar and Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {selectedAttendee.photoURL ? (
                    <img
                      src={selectedAttendee.photoURL}
                      alt={selectedAttendee.displayName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-teal-600"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center text-cream font-bold text-xl border-2 border-teal-600">
                      {getInitials(selectedAttendee.displayName)}
                    </div>
                  )}
                  <div
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-paper ${getStatusColor(selectedAttendee.status)}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-bold text-ink truncate">
                    {selectedAttendee.displayName}
                  </h3>
                  {selectedAttendee.organization && (
                    <p className="text-sm text-ink/70 truncate">
                      {selectedAttendee.organization}
                    </p>
                  )}
                  <p className="text-xs text-ink/60 mt-1">
                    {getStatusText(selectedAttendee.status)}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {/* Current Location */}
                <div className="bg-parchment rounded-lg p-3">
                  <div className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">
                    Current Location
                  </div>
                  <div className="text-sm text-ink font-medium">
                    {selectedAttendee.zone || 'Unknown'}
                  </div>
                </div>

                {/* Last Active */}
                <div className="bg-parchment rounded-lg p-3">
                  <div className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">
                    Last Active
                  </div>
                  <div className="text-sm text-ink font-medium">Just now</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleWave}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-cream font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                    />
                  </svg>
                  Wave
                </button>
                <button
                  onClick={handleFindOnMap}
                  className="flex-1 bg-ink hover:bg-ink/90 text-cream font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Find on Map
                </button>
              </div>

              {/* Privacy Notice */}
              <div className="text-xs text-ink/50 text-center pt-2 border-t border-ink/10">
                Location sharing is opt-in. This user has chosen to share their location.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
