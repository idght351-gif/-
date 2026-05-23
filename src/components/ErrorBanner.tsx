/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
 */

import { motion } from "motion/react";

interface ErrorBannerProps {
  title: string;
  message: string;
  onClose: () => void;
}

export function ErrorBanner({ title, message, onClose }: ErrorBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-0 left-0 right-0 z-50 p-4 bg-neutral-900 text-white border-b border-neutral-700 shadow-lg text-xs"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold tracking-tight">{title}</h4>
          <p className="text-neutral-300 mt-1 leading-normal font-mono text-[10px]">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 hover:bg-neutral-800 rounded font-bold"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}
