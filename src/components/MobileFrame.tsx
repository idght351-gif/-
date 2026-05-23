/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
 */

import { ReactNode } from "react";

interface MobileFrameProps {
  children: ReactNode;
}

export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-0 md:p-6 transition-colors duration-300">
      {/* Container to center and scale */}
      <div className="relative w-full max-w-md md:h-[860px] md:min-h-[820px] bg-white md:rounded-[40px] md:shadow-[0_24px_60px_rgba(0,82,255,0.08)] md:border-8 md:border-neutral-900 flex flex-col overflow-hidden transition-all duration-300">
        
        {/* Mobile Device Status Bar Design (Minimised/Cleaned - No cluttered, unrequested indicators) */}
        <div className="hidden md:flex h-6 bg-white shrink-0 items-center justify-between px-6 select-none border-b border-brand-border">
          <span className="text-[11px] font-bold tracking-tight text-brand-blue">
            BLOG REVIEWS
          </span>
          {/* Simulated Clean Camera Punch-hole */}
          <div className="w-3 h-3 rounded-full bg-neutral-900 absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="text-[11px] font-bold tracking-tight text-brand-orange">
            OPTIMIZED
          </span>
        </div>

        {/* Dynamic App Content Body */}
        <div className="flex-1 flex flex-col overflow-y-auto text-neutral-900 bg-white">
          {children}
        </div>

        {/* Simulated Mobile Home Indicator for sleek device feel */}
        <div className="hidden md:flex h-5 bg-white shrink-0 items-center justify-center select-none">
          <div className="w-24 h-1 rounded-full bg-neutral-200" />
        </div>
      </div>

      {/* Humble Footer info under the phone mockup */}
      <div className="hidden md:block mt-4 text-[11px] font-mono text-neutral-500 hover:text-brand-blue select-none transition-colors">
        Naver Blog Review Generator • LockBox Inspired Theme
      </div>
    </div>
  );
}
