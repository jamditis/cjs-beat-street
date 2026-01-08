import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Settings, Trophy } from 'lucide-react';
import { FloorSelector } from './components/FloorSelector';
import { PresenceList } from './components/PresenceList';
import { ConsentModal } from './components/ConsentModal';
import { TouchUI } from './components/TouchUI';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkipLinks } from './components/SkipLinks';
import { Announcer } from './components/VisuallyHidden';
import { NotificationBell } from './components/NotificationBell';
import { NotificationToast } from './components/NotificationToast';
import { usePresence } from './hooks/usePresence';
import { useOffline } from './hooks/useOffline';
import { useAnalyticsInit } from './hooks/useAnalytics';
import { eventBus } from './lib/EventBus';
import { VenueId } from './types/venue';
import { initializeReminders } from './services/notifications';

// Lazy-loaded components for code splitting
// GameContainer loads Phaser (~1.1MB) - defer until after auth
const GameContainer = lazy(() => import('./components/GameContainer').then(m => ({ default: m.GameContainer })));
const VenueSelector = lazy(() => import('./components/VenueSelector').then(m => ({ default: m.VenueSelector })));
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const POIPanel = lazy(() => import('./components/POIPanel').then(m => ({ default: m.POIPanel })));
const AttendeeCard = lazy(() => import('./components/AttendeeCard').then(m => ({ default: m.AttendeeCard })));
const LeaderboardPanel = lazy(() => import('./components/LeaderboardPanel').then(m => ({ default: m.LeaderboardPanel })));
const AttendeeTooltip = lazy(() => import('./components/AttendeeTooltip').then(m => ({ default: m.AttendeeTooltip })));
const AttendeeProfileModal = lazy(() => import('./components/AttendeeProfileModal').then(m => ({ default: m.AttendeeProfileModal })));
const AchievementPanel = lazy(() => import('./components/AchievementPanel').then(m => ({ default: m.AchievementPanel })));
const AchievementToast = lazy(() => import('./components/AchievementToast').then(m => ({ default: m.AchievementToast })));
const NotificationPanel = lazy(() => import('./components/NotificationPanel').then(m => ({ default: m.NotificationPanel })));

// Loading fallback for lazy components
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4" role="status" aria-label="Loading">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

interface VerifiedAttendee {
  uid: string;
  displayName: string;
  organization?: string;
  photoURL?: string;
}

function BeatStreetApp() {
  // Initialize analytics on app startup
  useAnalyticsInit();

  const [showConsentModal, setShowConsentModal] = useState(
    () => !localStorage.getItem('location-consent')
  );
  const [shareLocation, setShareLocation] = useState(
    () => localStorage.getItem('location-consent') === 'true'
  );
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showLeaderboardPanel, setShowLeaderboardPanel] = useState(false);
  const [showAchievementsPanel, setShowAchievementsPanel] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [_firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [attendee, setAttendee] = useState<VerifiedAttendee | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { isOnline } = useOffline();

  // Venue selection state
  const [selectedVenue, setSelectedVenue] = useState<VenueId | null>(() => {
    const cached = localStorage.getItem('beat-street-venue');
    return cached ? (cached as VenueId) : null;
  });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobile(hasTouch && (isMobileUA || isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for menu button event from TouchUI
  useEffect(() => {
    const unsubscribeMenu = eventBus.on('menu-button-pressed', () => {
      setShowSettingsPanel(true);
    });
    const unsubscribeLeaderboard = eventBus.on('leaderboard-button-pressed', () => {
      setShowLeaderboardPanel(true);
    });
    return () => {
      unsubscribeMenu();
      unsubscribeLeaderboard();
    };
  }, []);

  // Listen for achievements panel open event
  useEffect(() => {
    const unsubscribe = eventBus.on('open-achievements-panel', () => {
      setShowAchievementsPanel(true);
    });
    return unsubscribe;
  }, []);

  // Initialize notification reminders on app load
  useEffect(() => {
    initializeReminders();
  }, []);

  // Check for cached verification
  useEffect(() => {
    const cached = localStorage.getItem('beat-street-attendee');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid (24 hours)
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          setAttendee(parsed);
        } else {
          localStorage.removeItem('beat-street-attendee');
        }
      } catch {
        localStorage.removeItem('beat-street-attendee');
      }
    }
  }, []);

  // Listen for Firebase auth state
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Verify attendee against CJS2026
  const verifyAttendee = useCallback(async (user: User) => {
    setVerifying(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const verifyEndpoint = import.meta.env.VITE_VERIFY_ENDPOINT;

      if (!verifyEndpoint) {
        throw new Error('Verification service not configured');
      }

      const response = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.verified && data.attendee) {
        const verifiedAttendee: VerifiedAttendee = {
          uid: data.attendee.uid,
          displayName: data.attendee.displayName,
          organization: data.attendee.organization,
          photoURL: data.attendee.photoURL,
        };

        // Cache for 24 hours
        localStorage.setItem('beat-street-attendee', JSON.stringify({
          ...verifiedAttendee,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }));

        setAttendee(verifiedAttendee);
      } else {
        setError(data.error || 'You must be a registered CJS2026 attendee to access Beat Street.');
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setError('Unable to verify your registration. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, []);

  // Sign in with Google (CJS2026 uses Google auth)
  const handleSignIn = async () => {
    setError(null);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await verifyAttendee(result.user);
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('Sign in failed. Please try again.');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    const auth = getAuth();
    await auth.signOut();
    setAttendee(null);
    localStorage.removeItem('beat-street-attendee');
  };

  // Memoize presence options to prevent infinite re-renders
  const presenceOptions = useMemo(
    () =>
      attendee
        ? {
            uid: attendee.uid,
            displayName: attendee.displayName,
            shareLocation,
          }
        : null,
    [attendee?.uid, attendee?.displayName, shareLocation]
  );

  // Initialize presence system for verified attendees
  usePresence(presenceOptions);

  const handleConsent = (consent: boolean) => {
    setShareLocation(consent);
    setShowConsentModal(false);
    localStorage.setItem('location-consent', consent ? 'true' : 'false');
  };

  const handleLocationToggle = (share: boolean) => {
    setShareLocation(share);
    localStorage.setItem('location-consent', share ? 'true' : 'false');
  };

  // Venue selection handler (initial selection)
  const handleVenueSelect = (venueId: VenueId) => {
    setSelectedVenue(venueId);
    localStorage.setItem('beat-street-venue', venueId);
    // Emit event to Phaser to load venue
    eventBus.emit('venue-selected', { venueId });
  };

  // Venue change handler (from settings panel)
  const handleVenueChange = (venueId: VenueId) => {
    setSelectedVenue(venueId);
    localStorage.setItem('beat-street-venue', venueId);
    eventBus.emit('venue-changed', { venueId });
  };

  // Emit venue-selected on initial load when venue is already selected
  useEffect(() => {
    if (selectedVenue && attendee && !showConsentModal) {
      eventBus.emit('venue-selected', { venueId: selectedVenue });
    }
  }, [selectedVenue, attendee, showConsentModal]);

  // Loading state
  if (authLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-cream" role="status" aria-label="Loading application">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4" aria-hidden="true" />
          <p className="text-ink font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not verified - show sign in screen
  if (!attendee) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-cream">
        <main id="main-content" className="max-w-md w-full mx-4 bg-paper rounded-2xl shadow-xl p-8 text-center" role="main">
          {/* Logo */}
          <div className="mb-6">
            <h1 className="font-display text-4xl text-ink mb-2">Beat Street</h1>
            <p className="text-ink/70 font-body">CJS2026 Navigator</p>
          </div>

          {/* Description */}
          <p className="text-ink/80 mb-8 font-body">
            Explore the conference venue, find sessions, and connect with other attendees.
          </p>

          {/* Error message */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={handleSignIn}
            disabled={verifying}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            aria-describedby="sign-in-help"
          >
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden="true" />
                <span>Verifying registration...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {/* Help text */}
          <p id="sign-in-help" className="mt-6 text-sm text-ink/60">
            Use the same Google account you registered with for CJS2026.
          </p>

          {/* Registration link */}
          <p className="mt-4 text-sm text-ink/60">
            Not registered?{' '}
            <a
              href="https://cjs2026.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 underline"
            >
              Get your ticket
            </a>
          </p>
        </main>
      </div>
    );
  }

  // Show venue selector if no venue selected (after consent is handled)
  if (!selectedVenue && !showConsentModal) {
    return (
      <div className="h-full w-full bg-cream">
        <Suspense fallback={<LoadingSpinner />}>
          <VenueSelector
            currentVenue={selectedVenue ?? undefined}
            onSelectVenue={handleVenueSelect}
          />
        </Suspense>
      </div>
    );
  }

  // Verified attendee - show the app
  return (
    <div className="h-full w-full relative bg-cream">
      {/* Skip links for keyboard navigation */}
      <SkipLinks
        links={[
          { targetId: 'main-content', label: 'Skip to main content' },
          { targetId: 'navigation', label: 'Skip to navigation' },
        ]}
      />

      {/* Screen reader announcements for offline status */}
      <Announcer politeness="polite">
        {!isOnline ? 'You are currently offline. Some features may be limited.' : ''}
      </Announcer>

      {/* Offline indicator */}
      {!isOnline && (
        <div
          className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 z-50 text-sm"
          role="alert"
          aria-live="polite"
        >
          You're offline. Some features may be limited.
        </div>
      )}

      {/* Desktop navigation buttons (hidden on mobile, TouchUI handles it there) */}
      {!isMobile && (
        <nav id="navigation" className="absolute top-4 right-4 z-40 flex gap-2" aria-label="Main navigation">
          <NotificationBell onViewAll={() => setShowNotificationsPanel(true)} />
          <button
            onClick={() => setShowLeaderboardPanel(true)}
            className="w-10 h-10 bg-paper/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-paper transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            aria-label="Open leaderboard"
            aria-haspopup="dialog"
          >
            <Trophy className="w-5 h-5 text-teal-600" aria-hidden="true" />
          </button>
          <button
            onClick={() => setShowAchievementsPanel(true)}
            className="w-10 h-10 bg-paper/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-paper transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            aria-label="Open achievements"
            aria-haspopup="dialog"
          >
            <Trophy className="w-5 h-5 text-amber-600" aria-hidden="true" />
          </button>
          <button
            onClick={() => setShowSettingsPanel(true)}
            className="w-10 h-10 bg-paper/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-paper transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            aria-label="Open settings"
            aria-haspopup="dialog"
          >
            <Settings className="w-5 h-5 text-ink" aria-hidden="true" />
          </button>
        </nav>
      )}

      {/* Main game view */}
      <main id="main-content" className="h-full w-full" role="main" aria-label="Interactive conference map">
        <Suspense fallback={<LoadingSpinner />}>
          <GameContainer />
        </Suspense>
      </main>

      {/* UI Overlays */}
      <Suspense fallback={null}>
        <POIPanel />
      </Suspense>
      <FloorSelector />
      <PresenceList />
      <TouchUI />
      <Suspense fallback={null}>
        <AttendeeTooltip />
      </Suspense>
      <Suspense fallback={null}>
        <AttendeeCard />
      </Suspense>

      {/* Modals */}
      {showConsentModal && <ConsentModal onConsent={handleConsent} />}
      <Suspense fallback={null}>
        <AttendeeProfileModal />
      </Suspense>
      <Suspense fallback={null}>
        <SettingsPanel
          isOpen={showSettingsPanel}
          onClose={() => setShowSettingsPanel(false)}
          shareLocation={shareLocation}
          onLocationToggle={handleLocationToggle}
          displayName={attendee.displayName}
          onSignOut={handleSignOut}
          currentVenue={selectedVenue ?? undefined}
          onVenueChange={handleVenueChange}
        />
      </Suspense>

      {/* Leaderboard Panel */}
      <Suspense fallback={null}>
        <LeaderboardPanel
          isOpen={showLeaderboardPanel}
          onClose={() => setShowLeaderboardPanel(false)}
          userId={attendee.uid}
          displayName={attendee.displayName}
          photoURL={attendee.photoURL}
        />
      </Suspense>

      {/* Achievement Panel */}
      <Suspense fallback={null}>
        <AchievementPanel
          isOpen={showAchievementsPanel}
          onClose={() => setShowAchievementsPanel(false)}
          uid={attendee.uid}
          displayName={attendee.displayName}
        />
      </Suspense>

      {/* Achievement Toast Notifications */}
      <Suspense fallback={null}>
        <AchievementToast position="top-right" duration={6000} />
      </Suspense>

      {/* Notification Panel */}
      <Suspense fallback={null}>
        <NotificationPanel
          isOpen={showNotificationsPanel}
          onClose={() => setShowNotificationsPanel(false)}
        />
      </Suspense>

      {/* Notification Toast (session reminders, announcements) */}
      <NotificationToast />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BeatStreetApp />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
