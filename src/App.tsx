import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GameContainer } from './components/GameContainer';
import { POIPanel } from './components/POIPanel';
import { FloorSelector } from './components/FloorSelector';
import { PresenceList } from './components/PresenceList';
import { ConsentModal } from './components/ConsentModal';
import { usePresence } from './hooks/usePresence';
import { useOffline } from './hooks/useOffline';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function BeatStreetApp() {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [shareLocation, setShareLocation] = useState(false);
  const [user] = useState<{ uid: string; displayName: string } | null>(null);
  const { isOnline } = useOffline();

  // Initialize presence system if user is authenticated
  usePresence(
    user
      ? {
          uid: user.uid,
          displayName: user.displayName,
          shareLocation,
        }
      : null
  );

  const handleConsent = (consent: boolean) => {
    setShareLocation(consent);
    setShowConsentModal(false);
    localStorage.setItem('location-consent', consent ? 'true' : 'false');
  };

  return (
    <div className="h-full w-full relative bg-cream">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 z-50 text-sm">
          You're offline. Some features may be limited.
        </div>
      )}

      {/* Main game view */}
      <GameContainer />

      {/* UI Overlays */}
      <POIPanel />
      <FloorSelector />
      <PresenceList />

      {/* Modals */}
      {showConsentModal && <ConsentModal onConsent={handleConsent} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BeatStreetApp />
    </QueryClientProvider>
  );
}

export default App;
