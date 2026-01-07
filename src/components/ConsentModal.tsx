import { motion } from 'framer-motion';

interface ConsentModalProps {
  onConsent: (shareLocation: boolean) => void;
}

export function ConsentModal({ onConsent }: ConsentModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-paper rounded-xl max-w-md p-6 shadow-2xl"
      >
        <h2 className="font-display text-2xl text-ink mb-4">
          Location Sharing
        </h2>

        <p className="text-ink/80 mb-6">
          Would you like other attendees to see your location in Beat Street?
          This helps with networking and finding colleagues.
        </p>

        <div className="space-y-3">
          {/* Equal prominence buttons - GDPR compliant */}
          <button
            onClick={() => onConsent(true)}
            className="w-full py-3 rounded-lg bg-teal-600 text-white font-semibold
                       hover:bg-teal-700 transition-colors"
          >
            Yes, share my location
          </button>

          <button
            onClick={() => onConsent(false)}
            className="w-full py-3 rounded-lg bg-cream text-ink font-semibold
                       border-2 border-ink/20 hover:border-ink/40 transition-colors"
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
