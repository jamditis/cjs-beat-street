import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { eventBus, UserPresence } from '../lib/EventBus';

export function PresenceList() {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = eventBus.on('presence-update', (data: unknown) => {
      const presenceData = data as { users: UserPresence[] };
      setUsers(presenceData.users);
    });

    return unsubscribe;
  }, []);

  if (users.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 bg-paper rounded-xl shadow-lg z-40 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          <span className="font-semibold text-ink">
            {users.length} nearby
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-ink/60" />
        ) : (
          <ChevronUp className="w-5 h-5 text-ink/60" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 py-2 border-t border-ink/10"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-500'
                        : user.status === 'idle'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-ink/60">{user.zone}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
