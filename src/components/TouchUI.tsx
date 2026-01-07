import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Hand, Menu, Trophy, RefreshCw } from 'lucide-react';
import { eventBus } from '../lib/EventBus';
import { triggerHaptic } from '../hooks/useHaptic';

interface TouchState {
  lastTapTime: number;
  tapCount: number;
}

export function TouchUI() {
  const [isMobile, setIsMobile] = useState(false);
  const [showActionHint, setShowActionHint] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const touchStateRef = useRef<TouchState>({ lastTapTime: 0, tapCount: 0 });

  // Pull-to-refresh state
  const pullY = useMotionValue(0);
  const pullProgress = useTransform(pullY, [0, 100], [0, 1]);
  const pullRotation = useTransform(pullY, [0, 100], [0, 360]);

  useEffect(() => {
    // Detect if device is mobile
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 1024;

      setIsMobile(hasTouch && (isMobileUA || isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Hide action hint after 5 seconds
    const timer = setTimeout(() => {
      setShowActionHint(false);
    }, 5000);

    // Listen for joystick state changes
    const unsubscribeJoystick = eventBus.on('joystick-state', (data: unknown) => {
      const state = data as { active: boolean };
      setJoystickActive(state.active);
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
      unsubscribeJoystick();
    };
  }, []);

  const handleActionButton = useCallback(() => {
    triggerHaptic('tap');
    // Emit event to trigger interaction with nearby POI
    eventBus.emit('action-button-pressed', {});
    setShowActionHint(false);
  }, []);

  const handleMenuButton = useCallback(() => {
    triggerHaptic('tap');
    // Emit event to open menu/settings
    eventBus.emit('menu-button-pressed', {});
  }, []);

  const handleLeaderboardButton = useCallback(() => {
    triggerHaptic('tap');
    // Emit event to open leaderboard
    eventBus.emit('leaderboard-button-pressed', {});
  }, []);

  // Double-tap to zoom handler for the game area
  const handleGameAreaTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - touchStateRef.current.lastTapTime;

    // Double-tap detection (within 300ms)
    if (timeSinceLastTap < 300) {
      touchStateRef.current.tapCount++;

      if (touchStateRef.current.tapCount === 2) {
        // Double-tap detected - zoom in
        triggerHaptic('doubleTap');

        // Get tap position for zoom center
        let x: number, y: number;
        if ('touches' in e && e.touches.length > 0) {
          x = e.touches[0].clientX;
          y = e.touches[0].clientY;
        } else if ('clientX' in e) {
          x = e.clientX;
          y = e.clientY;
        } else {
          x = window.innerWidth / 2;
          y = window.innerHeight / 2;
        }

        eventBus.emit('double-tap-zoom', { x, y, direction: 'in' });
        touchStateRef.current.tapCount = 0;
      }
    } else {
      touchStateRef.current.tapCount = 1;
    }

    touchStateRef.current.lastTapTime = now;
  }, []);

  // Two-finger tap to zoom out handler
  const handleTwoFingerTap = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      triggerHaptic('tap');

      // Calculate center point between two fingers
      const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      eventBus.emit('double-tap-zoom', { x, y, direction: 'out' });
    }
  }, []);

  // Pull-to-refresh for presence updates
  const handlePullStart = useCallback(() => {
    // Only allow pull when at top
    if (window.scrollY === 0) {
      triggerHaptic('selection');
    }
  }, []);

  const handlePull = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 0 && window.scrollY === 0) {
      pullY.set(Math.min(info.offset.y, 100));
    }
  }, [pullY]);

  const handlePullEnd = useCallback(async () => {
    const currentPull = pullY.get();

    if (currentPull >= 80) {
      triggerHaptic('success');
      setIsRefreshing(true);

      // Emit refresh event
      eventBus.emit('presence-refresh-requested', {});

      // Wait for refresh to complete (or timeout after 2s)
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsRefreshing(false);
    }

    pullY.set(0);
  }, [pullY]);

  if (!isMobile) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 touch-none"
      onTouchStart={handleGameAreaTap}
      onTouchEnd={(e) => {
        if (e.touches.length === 2) {
          handleTwoFingerTap(e as unknown as React.TouchEvent);
        }
      }}
    >
      {/* Pull-to-refresh indicator */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ y: pullY }}
      >
        <motion.div
          style={{
            opacity: pullProgress,
            rotate: pullRotation
          }}
          className="w-10 h-10 bg-paper rounded-full shadow-lg flex items-center justify-center mt-2"
        >
          <RefreshCw
            className={`w-5 h-5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </motion.div>
      </motion.div>

      {/* Joystick area hint (bottom-left) */}
      <AnimatePresence>
        {showActionHint && !joystickActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-28 left-4 bg-ink/80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none"
          >
            Touch here to move
          </motion.div>
        )}
      </AnimatePresence>

      {/* Joystick zone indicator (subtle gradient) */}
      <div
        className="absolute bottom-0 left-0 w-1/2 h-1/3 bg-gradient-to-tr from-ink/5 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Action button (bottom-right) - 64x64px meets Apple HIG 44px minimum */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleActionButton}
        className="absolute bottom-6 right-6 w-16 h-16 min-w-[44px] min-h-[44px] bg-teal-600 rounded-full shadow-lg flex items-center justify-center pointer-events-auto active:bg-teal-700 transition-colors touch-manipulation"
        aria-label="Interact with nearby point of interest"
        style={{ touchAction: 'manipulation' }}
      >
        <Hand className="w-7 h-7 text-white" />
      </motion.button>

      {/* Top-right button group - buttons meet Apple HIG 44px minimum */}
      <div className="absolute top-6 right-6 flex gap-2 pointer-events-auto">
        {/* Leaderboard button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLeaderboardButton}
          className="w-12 h-12 min-w-[44px] min-h-[44px] bg-paper/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center active:bg-cream transition-colors touch-manipulation"
          aria-label="Open leaderboard"
          style={{ touchAction: 'manipulation' }}
        >
          <Trophy className="w-6 h-6 text-teal-600" />
        </motion.button>

        {/* Menu button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleMenuButton}
          className="w-12 h-12 min-w-[44px] min-h-[44px] bg-paper/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center active:bg-cream transition-colors touch-manipulation"
          aria-label="Open menu"
          style={{ touchAction: 'manipulation' }}
        >
          <Menu className="w-6 h-6 text-ink" />
        </motion.button>
      </div>

      {/* Gesture hints overlay (shown briefly on first load) */}
      <AnimatePresence>
        {showActionHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-ink/80 text-white px-4 py-3 rounded-lg text-sm pointer-events-none max-w-[280px] text-center"
          >
            <div className="space-y-1">
              <p>Double-tap to zoom in</p>
              <p className="text-white/70">Two-finger tap to zoom out</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible pull-to-refresh drag zone */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-20 pointer-events-auto"
        onPanStart={handlePullStart}
        onPan={handlePull}
        onPanEnd={handlePullEnd}
        style={{ touchAction: 'pan-x' }}
      />
    </div>
  );
}
