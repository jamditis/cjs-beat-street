import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Building2, Hand, CheckCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { eventBus, UserPresence } from '../lib/EventBus';

interface AttendeeDetails extends UserPresence {
  organization?: string;
  photoURL?: string;
}

export function AttendeeCard() {
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeDetails | null>(null);
  const [waveStatus, setWaveStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const nearbyUsersRef = useRef<UserPresence[]>([]);

  // Keep track of nearby users from presence updates
  useEffect(() => {
    const unsubscribe = eventBus.on('presence-update', (data: unknown) => {
      const presenceData = data as { users: UserPresence[] };
      nearbyUsersRef.current = presenceData.users;
    });

    return unsubscribe;
  }, []);

  // Fetch attendee details from presence data or Firestore
  const fetchAttendeeDetails = useCallback(async (uid: string) => {
    // First, check if the user is in our nearby users list
    const nearbyUser = nearbyUsersRef.current.find((u) => u.uid === uid);

    if (nearbyUser) {
      // Found in nearby users, use that data
      setSelectedAttendee({
        ...nearbyUser,
        organization: undefined,
        photoURL: undefined,
      });
    }

    // Fetch additional details from Firestore (verified_attendees or presence)
    try {
      const presenceDoc = await getDoc(doc(db, 'presence', uid));
      if (presenceDoc.exists()) {
        const presenceData = presenceDoc.data() as UserPresence;

        // Try to get extended info from verified_attendees
        const attendeeDoc = await getDoc(doc(db, 'verified_attendees', uid));
        const attendeeData = attendeeDoc.exists() ? attendeeDoc.data() : {};

        setSelectedAttendee({
          ...presenceData,
          uid,
          organization: attendeeData.organization,
          photoURL: attendeeData.photoURL,
        });
      } else if (!nearbyUser) {
        // User not found in presence or nearby, close the card
        setSelectedAttendee(null);
      }
    } catch (error) {
      console.error('Error fetching attendee details:', error);
      // If we already have nearby user data, keep showing it
      if (!nearbyUser) {
        setSelectedAttendee(null);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.on('attendee-selected', (data: unknown) => {
      const selectionData = data as { uid: string };
      fetchAttendeeDetails(selectionData.uid);
    });

    return unsubscribe;
  }, [fetchAttendeeDetails]);

  const handleClose = useCallback(() => {
    setSelectedAttendee(null);
    setWaveStatus('idle');
  }, []);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedAttendee) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAttendee, handleClose]);

  const handleWave = async () => {
    if (!selectedAttendee || waveStatus !== 'idle') return;

    setWaveStatus('sending');

    // Emit wave event to backend
    eventBus.emit('send-wave', {
      fromUid: 'current-user', // Would come from auth context
      toUid: selectedAttendee.uid,
    });

    // Simulate sending delay
    setTimeout(() => {
      setWaveStatus('sent');
      setTimeout(() => setWaveStatus('idle'), 2000);
    }, 500);
  };

  const handleFindOnMap = () => {
    if (!selectedAttendee) return;

    // Emit event to focus on attendee in game
    eventBus.emit('focus-attendee', { uid: selectedAttendee.uid });

    // Optional: close card after focusing
    // handleClose();
  };

  const getStatusBadge = (status: 'active' | 'idle' | 'away') => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-300',
      idle: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      away: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    const labels = {
      active: 'Active',
      idle: 'Idle',
      away: 'Away',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        {labels[status]}
      </span>
    );
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <AnimatePresence>
      {selectedAttendee && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-80 bg-paper shadow-xl z-50 p-6 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendee-card-title"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-cream transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-ink" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-teal-600 mb-3">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Attendee
              </span>
            </div>

            {/* Avatar */}
            <div className="flex items-start gap-4 mb-4">
              {selectedAttendee.photoURL ? (
                <img
                  src={selectedAttendee.photoURL}
                  alt={selectedAttendee.displayName}
                  className="w-16 h-16 rounded-full border-3 border-teal-600"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-teal-600 border-3 border-white flex items-center justify-center text-white font-bold text-xl">
                  {getInitials(selectedAttendee.displayName)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h2 id="attendee-card-title" className="font-display text-xl text-ink mb-1 truncate">
                  {selectedAttendee.displayName}
                </h2>
                {getStatusBadge(selectedAttendee.status)}
              </div>
            </div>

            {/* Organization */}
            {selectedAttendee.organization && (
              <div className="flex items-center gap-2 text-ink/70 text-sm mb-2">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{selectedAttendee.organization}</span>
              </div>
            )}

            {/* Location */}
            <div className="flex items-center gap-2 text-ink/70 text-sm">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedAttendee.zone}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 mt-auto">
            <button
              onClick={handleWave}
              disabled={waveStatus !== 'idle'}
              className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                waveStatus === 'sent'
                  ? 'bg-green-600 text-white'
                  : waveStatus === 'sending'
                  ? 'bg-teal-400 text-white cursor-wait'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {waveStatus === 'sent' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Wave Sent!
                </>
              ) : waveStatus === 'sending' ? (
                <>
                  <Hand className="w-5 h-5 animate-bounce" />
                  Sending...
                </>
              ) : (
                <>
                  <Hand className="w-5 h-5" />
                  Send Wave
                </>
              )}
            </button>

            <button
              onClick={handleFindOnMap}
              className="w-full py-3 border-2 border-teal-600 text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Find on Map
            </button>
          </div>

          {/* Info Footer */}
          <div className="mt-6 pt-4 border-t border-ink/10">
            <p className="text-xs text-ink/60 text-center">
              Respect attendee privacy. Only wave if you want to connect!
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
