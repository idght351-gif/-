/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { MobileFrame } from "./components/MobileFrame";
import { ReviewForm } from "./components/ReviewForm";
import { ReviewOutput } from "./components/ReviewOutput";
import { ErrorBanner } from "./components/ErrorBanner";
import { HistoryOverlay } from "./components/HistoryOverlay";
import { ReviewGenerationParams, ReviewHistoryItem } from "./types";
import { AnimatePresence } from "motion/react";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<"form" | "result">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [storeName, setStoreName] = useState("");
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);
  const [errorStatus, setErrorStatus] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem("naver_blog_review_history");
    if (cached) {
      try {
        setHistory(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse review history", e);
      }
    }
  }, []);

  // Save changes to history
  const saveHistory = (newHistory: ReviewHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("naver_blog_review_history", JSON.stringify(newHistory));
  };

  const handleGenerateReview = async (
    params: ReviewGenerationParams,
    screenshotDataUrls: string[],
    visitImages: { id: string; name: string; dataUrl: string }[],
    guidelineImages?: string[]
  ) => {
    setIsLoading(true);
    setErrorStatus(null);
    setStoreName(params.storeName);

    try {
      const response = await fetch("/api/generate-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName: params.storeName,
          storeCategory: params.storeCategory,
          tone: params.tone,
          keywords: params.keywords,
          guidelines: params.guidelines,
          images: screenshotDataUrls,
          visitImages: visitImages,
          guidelineImages: guidelineImages || [],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "리뷰를 생성하는 도중 예상치 못한 오류가 발생했습니다.");
      }

      setGeneratedText(data.reviewText);
      setActiveScreen("result");

      // Add to local history list
      const newItem: ReviewHistoryItem = {
        id: crypto.randomUUID(),
        storeName: params.storeName,
        storeCategory: params.storeCategory,
        tone: params.tone,
        keywords: params.keywords,
        generatedText: data.reviewText,
        createdAt: new Date().toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const updatedHistory = [newItem, ...history].slice(0, 8); // Keep last 8 generations
      saveHistory(updatedHistory);

    } catch (err: any) {
      console.error(err);
      setErrorStatus({
        title: "리뷰 생성 실패",
        message: err.message || "API 요청 도중 통신 장애가 발생했거나 원고 가공이 지연되었습니다. 다시 한 번 시도 부탁드립니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Click history item to preview
  const handleLoadHistoryItem = (item: ReviewHistoryItem) => {
    setStoreName(item.storeName);
    setGeneratedText(item.generatedText);
    setActiveScreen("result");
    setShowHistoryOverlay(false);
  };

  const clearHistory = () => {
    if (window.confirm("생성 기록 보관함을 지우시겠습니까?")) {
      saveHistory([]);
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
  };

  return (
    <MobileFrame>
      <div className="flex-1 w-full relative flex flex-col justify-between">
        
        {/* Error Notification Banner inside the phone mock */}
        <AnimatePresence>
          {errorStatus && (
            <ErrorBanner
              title={errorStatus.title}
              message={errorStatus.message}
              onClose={() => setErrorStatus(null)}
            />
          )}
        </AnimatePresence>

        {/* Content Slider (Switches screens with premium fade transition) */}
        <div className="flex-1 flex flex-col justify-start">
          {activeScreen === "form" ? (
            <ReviewForm onGenerate={handleGenerateReview} isLoading={isLoading} />
          ) : (
            <ReviewOutput
              generatedText={generatedText}
              storeName={storeName}
              onReset={() => setActiveScreen("form")}
            />
          )}
        </div>

        {/* Muted Black and White History Trigger Button at the very bottom */}
        {activeScreen === "form" && (
          <div className="px-6 pb-6 pt-2 shrink-0 border-t border-neutral-100 bg-[#fbfbfb]">
            <button
              onClick={() => setShowHistoryOverlay(true)}
              className="w-full py-2.5 bg-white border border-neutral-200 text-neutral-800 hover:border-neutral-900 font-mono text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1.5"
            >
              📁 최근 검색 및 생성 보관함 ({history.length})
            </button>
          </div>
        )}

        {/* Immersive Black & White History Overlay Drawer inside the phone framework */}
        <HistoryOverlay
          isOpen={showHistoryOverlay}
          history={history}
          onClose={() => setShowHistoryOverlay(false)}
          onLoadItem={handleLoadHistoryItem}
          onClearAll={clearHistory}
          onDeleteItem={deleteHistoryItem}
        />

      </div>
    </MobileFrame>
  );
}
