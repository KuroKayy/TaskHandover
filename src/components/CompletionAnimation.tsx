import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
  onDone: () => void;
}

export function CompletionAnimation({ show, onDone }: Props) {
  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <span className="text-6xl">🎉</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
