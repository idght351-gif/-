/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
 */

import { motion, AnimatePresence } from "motion/react";
import { ReviewHistoryItem } from "../types";

interface HistoryOverlayProps {
  isOpen: boolean;
  history: ReviewHistoryItem[];
  onClose: () => void;
  onLoadItem: (item: ReviewHistoryItem) => void;
  onClearAll: () => void;
  onDeleteItem: (e: React.MouseEvent, id: string) => void;
}

export function HistoryOverlay({
  isOpen,
  history,
  onClose,
  onLoadItem,
  onClearAll,
  onDeleteItem,
}: HistoryOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black z-40 cursor-pointer"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute left-0 right-0 bottom-0 max-h-[75%] bg-white rounded-t-2xl shadow-[0_-16px_36px_rgba(0,0,0,0.1)] border-t border-neutral-200 z-50 flex flex-col p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                생성 기록 보관함 ({history.length})
              </h3>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-800 text-sm font-bold"
              >
                닫기
              </button>
            </div>

            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-neutral-400">
                <span className="text-sm font-mono block">EMPTY LIST</span>
                <span className="text-[10px] mt-1">저장된 블로그 리뷰 포스트가 없습니다.</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onLoadItem(item)}
                    className="p-3 border border-neutral-200 hover:border-neutral-950 rounded-lg cursor-pointer transition-colors bg-white hover:bg-neutral-50 flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {item.storeName}
                        </span>
                        {item.storeCategory && (
                          <span className="text-[9px] bg-neutral-100 px-1 py-0.2 rounded text-neutral-500 font-mono">
                            {item.storeCategory}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-neutral-400 font-mono">
                        <span>{item.createdAt}</span>
                        <span>•</span>
                        <span className="capitalize">{item.tone}</span>
                      </div>
                    </div>

                    {/* Individual item delete button */}
                    <button
                      onClick={(e) => onDeleteItem(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-900 transition-opacity rounded hover:bg-neutral-100 text-xs"
                      title="삭제"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={onClearAll}
                  className="w-full py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 text-[10px] font-mono tracking-wide rounded-md transition-colors border border-neutral-200"
                >
                  전체 로컬 데이터 초기화
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
