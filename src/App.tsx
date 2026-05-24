/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
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
          personalExperience: params.personalExperience,
          images: screenshotDataUrls,
          visitImages: visitImages,
          guidelineImages: guidelineImages || [],
          targetLength: params.targetLength,
          requiredKeywords: params.requiredKeywords,
          optionalKeywords: params.optionalKeywords,
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

  // Pre-load premium demo data so user can preview and test editing and scoring right away
  const handleLoadDemo = () => {
    setStoreName("안동 참숯오리 압구정로데오점");
    setGeneratedText(`[제목]
압구정로데오 오리고기 맛집 안동 참숯오리, 단체 회식 장소로 인생 맛집 찾았어요!

[본문]
단언컨대 직장인들이 압구정 근처에서 모임을 잡을 때 가장 호불호 없이 만족스러운 메뉴를 꼽자면 단연코 참숯에 노릇하게 구워 먹는 영양 만점 오리고기일 텐데요. 최근에 회사 식구들과 예약하고 직행했던 안동 참숯오리 압구정로데오점은 깔끔한 분위기부터 시작해서 격조 높은 밑반찬 솜씨까지 제 인생 오리구이 리스트에 곧바로 1순위로 안착한 곳이랍니다!

“매장 위치 및 주차 안내”
---

안동 참숯오리는 압구정로데오역 5번 출구에서 수월하게 도보 4분 거리에 위치하고 있어 접근성 면에서도 더할 나위 없이 쾌적했습니다. 공식 계정 @hzyz.official 도 운영 중이어서 방문 전에 미리 시그니처 구이 메뉴들을 비주얼로 먼저 감상해 보고 갔는데, 확실히 실물 포스가 압도적이더라고요.

[실제첨부 사진 1] - 매장의 모던하고 넓은 홀 전경과 정갈한 테이블 세팅

“아늑한 매장 내부 분위기”
---

이곳은 단체로 방문했을 때 오순도순 이야기를 나누기 적합한 부스석과 단독 프라이빗 룸이 마련되어 있어 압구정로데오 회식 맛집으로 예약 전부터 이미 입소문이 자자했던 이유를 온몸으로 실감할 수 있었습니다. 특히 매장이 엄격하게 위생을 신경 쓰고 세련된 무드로 연출되어 있어 젊은 커플들의 트렌디한 압구정 감성 데이트 코스로도 대단히 높은 점수를 주고 싶네요.

이곳의 주력 메뉴는 숯불 청정 생오리구이(판 59,000원)와 매콤한 비법 양념장과 대파가 가득 어우러진 특제 오리주물럭(62,000원), 그리고 겨울과 환절기 몸보신에 이만한 것이 없는 가마솥 영양 오리백숙(85,000원) 등이 준비되어 있습니다.

[실제첨부 사진 2] - 도톰한 두께가 인상적인 신선한 청정 생소금오리구이 한 접시

“오늘의 주문 메뉴 솔직 시식평”
---

저희가 주문한 생오리 소금구이는 육질의 때깔부터가 남달랐는데요. 참숯 화력이 아주 강력해서 불판에 올리자마자 퍼지는 고소한 향과 함께 표면에 육즙이 들어차며 노릇노릇하게 구워지기 시작했습니다. 압구정로데오 오리고기 맛집답게 인공적인 잡내나 누린내는 눈 씻고 찾아봐도 없었고, 한 입 씹을 때마다 쫄깃하게 터지는 육즙 가득한 맛이 그야말로 예술이었어요.

[실제첨부 사진 3] - 활활 불타오르는 국산 특참숯 위에 석쇠 오리구이가 올라간 매혹적인 항공샷

[실제첨부 사진 4] - 보글보글 끓여내서 들깨가루와 미나리를 풍성하게 얹은 오리탕 뚝배기 후식

“솔직한 총평 및 방문 꿀팁”
---

가이드라인에 명시되어 있던 글자 수 1300자 이상, 이미지 13장 이상의 조건들을 실제 노출 상위 등급 포스팅 답게 충실히 다채로운 포지션으로 구성했습니다. 압구정 인근에서 회식이나 소중한 가족 모임을 조율하고 계신다면, 고민 없이 안동 참숯오리를 0순위 예약 후보로 강력 추천해 드립니다! 후회 없는 행복 가득한 만찬이 되실 것을 장담해요!`);
    setActiveScreen("result");
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
            <ReviewForm
              onGenerate={handleGenerateReview}
              isLoading={isLoading}
              onLoadDemo={handleLoadDemo}
            />
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
