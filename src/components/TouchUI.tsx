import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Menu, Trophy } from 'lucide-react';
import { eventBus } from '../lib/EventBus';

export function TouchUI() {
  const [isMobile, setIsMobile] = useState(false);
  const [showActionHint, setShowActionHint] = useState(true);

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

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);

  const handleActionButton = () => {
    // Emit event to trigger interaction with nearby POI
    eventBus.emit('action-button-pressed', {});
    setShowActionHint(false);
  };

  const handleMenuButton = () => {
    // Emit event to open menu/settings
    eventBus.emit('menu-button-pressed', {});
  };

  const handleLeaderboardButton = () => {
    // Emit event to open leaderboard
    eventBus.emit('leaderboard-button-pressed', {});
  };

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Joystick area hint (bottom-left) */}
      <AnimatePresence>
        {showActionHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-4 bg-ink/80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none"
          >
            Touch here to move
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button (bottom-right) */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleActionButton}
        className="absolute bottom-6 right-6 w-16 h-16 bg-teal-600 rounded-full shadow-lg flex items-center justify-center pointer-events-auto active:bg-teal-700 transition-colors"
        aria-label="Interact"
      >
        <Hand className="w-7 h-7 text-white" />
      </motion.button>

      {/* Top-right button group */}
      <div className="absolute top-6 right-6 flex gap-2 pointer-events-auto">
        {/* Leaderboard button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLeaderboardButton}
          className="w-12 h-12 bg-paper/90 rounded-full shadow-lg flex items-center justify-center active:bg-cream transition-colors"
          aria-label="Leaderboard"
        >
          <Trophy className="w-6 h-6 text-teal-600" />
        </motion.button>

        {/* Menu button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleMenuButton}
          className="w-12 h-12 bg-paper/90 rounded-full shadow-lg flex items-center justify-center active:bg-cream transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6 text-ink" />
        </motion.button>
      </div>

      {/* Joystick zone indicator (subtle) */}
      <div className="absolute bottom-0 left-0 w-1/2 h-1/3 bg-gradient-to-tr from-ink/5 to-transparent pointer-events-none" />
    </div>
  );
}
