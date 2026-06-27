import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-rich-black/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg max-h-[80vh] overflow-y-auto bg-near-black border border-gold-accent/20 rounded-xl shadow-subtle-lg z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-charcoal-lighter">
              <h2 className="text-xl font-display font-bold text-paper-dark">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-charcoal-lighter transition-colors"
              >
                <X className="w-5 h-5 text-paper-dark/60" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
