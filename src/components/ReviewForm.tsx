/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
 */

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadedFile, ReviewTone, ReviewGenerationParams } from "../types";
import { AnimatePresence, motion } from "motion/react";

/**
 * Utility to compress images client-side.
 * It resizes large images so that they stay well below Vercel's 4.5MB request payload limit.
 * Resizing is perfectly fine since Gemini Vision models easily read guidelines and text at 1200px or 1400px resolution.
 */
const compressImageIfNeeded = (file: File, maxDimension: number = 1400, quality: number = 0.82): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();
    reader.onloadend = () => {
      img.src = reader.result as string;
    };
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions to fit maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as image/jpeg to drastically reduce size while preserving contrast and text legibility
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      } else {
        // Fallback to original reader result
        resolve((reader.result as string) || "");
      }
    };
    
    img.onerror = () => {
      // Fallback in case of image loading failure
      const fallbackReader = new FileReader();
      fallbackReader.onloadend = () => resolve((fallbackReader.result as string) || "");
      fallbackReader.readAsDataURL(file);
    };

    reader.readAsDataURL(file);
  });
};

interface ReviewFormProps {
  onGenerate: (
    params: ReviewGenerationParams,
    screenshotDataUrls: string[],
    visitImages: { id: string; name: string; dataUrl: string }[],
    guidelineImages?: string[]
  ) => void;
  isLoading: boolean;
  onLoadDemo?: () => void;
}

export function ReviewForm({ onGenerate, isLoading, onLoadDemo }: ReviewFormProps) {
  // Store info
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [tone, setTone] = useState<ReviewTone>("friendly");
  const [personalExperience, setPersonalExperience] = useState("");
  
  // Image Compression & Resolution Custom Settings (Option 1)
  const [maxImgDimension, setMaxImgDimension] = useState<number>(1400);
  const [imgQuality, setImgQuality] = useState<number>(0.82);
  const [showAdvancedImgSettings, setShowAdvancedImgSettings] = useState(false);
  
  // Custom requirements states
  const [targetLength, setTargetLength] = useState<number>(1300);
  const [requiredKeywordInput, setRequiredKeywordInput] = useState("");
  const [requiredKeywords, setRequiredKeywords] = useState<string[]>([]);
  const [optionalKeywordInput, setOptionalKeywordInput] = useState("");
  const [optionalKeywords, setOptionalKeywords] = useState<string[]>([]);

  // Screenshots (2~3 files to learn best quality blog formats)
  const [screenshots, setScreenshots] = useState<UploadedFile[]>([]);
  
  // New: Actual Visit Photos (ordered 1, 2, 3... to be placed sequentially inside the review)
  const [visitImages, setVisitImages] = useState<UploadedFile[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const visitImageInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop states
  const [isDragOverImage, setIsDragOverImage] = useState(false);
  const [isDragOverVisit, setIsDragOverVisit] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Touch drag states for mobile sorting
  const [touchDraggedIndex, setTouchDraggedIndex] = useState<number | null>(null);
  const touchTimeoutRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Handle reference uploads (style screenshots, PDFs, documents)
  const processImageFiles = (files: FileList) => {
    const currentCount = screenshots.length;
    const remainingSlots = 3 - currentCount;
    if (remainingSlots <= 0) return;

    const filesToProcess = Array.from(files)
      .filter((file) => 
        file.type.startsWith("image/") || 
        file.type === "application/pdf" || 
        file.name.endsWith(".pdf") || 
        file.name.endsWith(".txt") || 
        file.name.endsWith(".docx") || 
        file.name.endsWith(".doc") ||
        file.name.endsWith(".hwp")
      )
      .slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      compressImageIfNeeded(file, maxImgDimension, imgQuality).then((dataUrl) => {
        if (dataUrl) {
          const newUploaded: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "text/plain"),
            dataUrl: dataUrl,
          };
          setScreenshots((prev) => [...prev, newUploaded].slice(0, 3));
        }
      });
    });
  };

  // New: Handle visit images uploads with sequential ordering (preserving exact selection order)
  const processVisitImageFiles = async (files: FileList) => {
    const filesToProcess = Array.from(files).filter((file) => file.type.startsWith("image/"));
    
    const loadedFilesPromises = filesToProcess.map((file) => {
      return compressImageIfNeeded(file, maxImgDimension, imgQuality).then((dataUrl) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: dataUrl,
      }));
    });

    try {
      const newImages = await Promise.all(loadedFilesPromises);
      setVisitImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error("Error loading visit images in sequence:", err);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processImageFiles(e.target.files);
    }
  };

  const handleVisitImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processVisitImageFiles(e.target.files);
    }
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverImage(false);
    if (e.dataTransfer.files) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  const handleVisitImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverVisit(false);
    if (e.dataTransfer.files) {
      processVisitImageFiles(e.dataTransfer.files);
    }
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((item) => item.id !== id));
  };

  const removeVisitImage = (id: string) => {
    setVisitImages((prev) => prev.filter((item) => item.id !== id));
  };

  // Reorder index mapping
  const moveVisitImage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === visitImages.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...visitImages];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setVisitImages(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...visitImages];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setVisitImages(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Touch drag and drop sorting handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    // Store original touch coordinates
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Reset timer
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    
    // Initiate visual hold state after 150ms to verify user is intentional
    touchTimeoutRef.current = setTimeout(() => {
      setTouchDraggedIndex(index);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, 150);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    // If drag hasn't activated yet, detect if movement indicates quick scrolling instead
    if (touchDraggedIndex === null) {
      if (touchStartPosRef.current) {
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
          if (touchTimeoutRef.current) {
            clearTimeout(touchTimeoutRef.current);
            touchTimeoutRef.current = null;
          }
        }
      }
      return;
    }

    // Active drag sorting -> prevent browser generic scroll
    if (e.cancelable) {
      e.preventDefault();
    }

    // Capture element under touch finger
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const cardEl = element.closest("[data-sort-index]");
    if (!cardEl) return;

    const targetIndexAttr = cardEl.getAttribute("data-sort-index");
    if (targetIndexAttr === null) return;

    const targetIndex = parseInt(targetIndexAttr, 10);
    if (isNaN(targetIndex) || targetIndex === touchDraggedIndex) return;

    // Perform state array sorting transition
    const updated = [...visitImages];
    const draggedItem = updated[touchDraggedIndex];
    updated.splice(touchDraggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setTouchDraggedIndex(targetIndex);
    setVisitImages(updated);
  };

  const handleTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    setTouchDraggedIndex(null);
    touchStartPosRef.current = null;
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName) {
      alert("01단계 '가게 기본 정보'의 가게명을 입력해 주세요! 가게명이 기입되어야 고성능 블로그 본문 생성이 시작됩니다.");
      const inputEl = document.getElementById("store-name-input");
      if (inputEl) {
        inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
        inputEl.focus();
      }
      return;
    }

    const payload: ReviewGenerationParams = {
      storeName,
      storeCategory,
      tone,
      keywords: requiredKeywords, // legacy compatibility
      guidelines: `[작성 가이드라인]\n- 최소 권장 글자수: ${targetLength}자 이상\n- 필수 키워드: ${requiredKeywords.join(", ")}\n- 선택 키워드: ${optionalKeywords.join(", ")}`,
      personalExperience,
      targetLength,
      requiredKeywords,
      optionalKeywords,
    };

    const imgDataUrls = screenshots.map((s) => s.dataUrl);
    const visitImgList = visitImages.map((s) => ({
      id: s.id,
      name: s.name,
      dataUrl: s.dataUrl,
    }));
    onGenerate(payload, imgDataUrls, visitImgList, []);
  };

  return (
    <div className="flex flex-col p-6 space-y-6">
      
      {/* App Header Inside Mobile screen - LockBox Sleek Blueprint */}
      <div className="text-center pb-5 border-b border-brand-border">
        {/* LockBox Logo shape badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50/80 text-brand-blue font-bold tracking-wide text-[10px] rounded-full uppercase mb-2">
          <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-pulse" />
          AI Synthesis Engine
        </div>
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">
          블로그 리뷰 <span className="text-brand-blue">신디사이저</span>
        </h1>
        <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
          우수리뷰 이미지의 서식과 본문을 학습하여<br />독창적이고 완성도 높은 포스팅 원고를 생성합니다
        </p>
      </div>

      {/* 🎁 Demo Presentation Callout */}
      {onLoadDemo && (
        <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-100 rounded-2xl p-4 flex flex-col space-y-2.5 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎁</span>
            <span className="text-xs font-bold text-neutral-800">
              최종결과 원고를 바로 체험해보고 싶으신가요?
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 leading-relaxed font-sans">
            사진이나 가이드라인을 직접 준비하지 않아도, 원클릭으로 완벽하게 조율된 최고급 네이버 SEO 블로그 포스팅 최종형과 실시간 요약 통계, 연동 수정을 체험하실 수 있습니다.
          </p>
          <button
            type="button"
            onClick={onLoadDemo}
            className="w-full py-2.5 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
          >
            🚀 임의 데이터로 결과물 샘플 즉시 보기
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Step 1: Store Basics */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[9px] bg-brand-blue text-white font-bold rounded-md font-mono">
              01
            </span>
            <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
              가게 기본 정보
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                id="store-name-input"
                type="text"
                placeholder="가게명 (예: 맛찬들 홍대)"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={isLoading}
                className="w-full text-xs px-3 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-brand-blue focus:bg-white outline-none rounded-lg transition-all placeholder:text-neutral-400 focus:ring-1 focus:ring-brand-blue"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="업종 (예: 맛집, 카페)"
                value={storeCategory}
                onChange={(e) => setStoreCategory(e.target.value)}
                disabled={isLoading}
                className="w-full text-xs px-3 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-brand-blue focus:bg-white outline-none rounded-lg transition-all placeholder:text-neutral-400 focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Reference review screenshots (2~3 files) */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 text-[9px] bg-brand-blue text-white font-bold rounded-md font-mono">
                02
              </span>
              <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
                우수리뷰 캡처 이미지 및 분석 파일 (2~3개)
              </label>
            </div>
            <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded-full text-brand-blue font-bold font-mono">
              {screenshots.length} / 3
            </span>
          </div>

          {/* Screenshot Dropzone */}
          {screenshots.length < 3 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverImage(true);
              }}
              onDragLeave={() => setIsDragOverImage(false)}
              onDrop={handleImageDrop}
              onClick={() => imageInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                isDragOverImage
                  ? "border-brand-blue bg-blue-50/30"
                  : "border-neutral-200 hover:border-brand-blue hover:bg-neutral-50 bg-neutral-50/50"
              }`}
            >
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageChange}
                accept="image/*,application/pdf,text/plain,.doc,.docx,.hwp"
                multiple
                className="hidden"
                disabled={isLoading}
              />
              <p className="text-xs font-bold text-neutral-800">
                우수리뷰 캡쳐본, PDF, 문서 파일을 여기에 드롭 & 클릭
              </p>
              <p className="text-[10px] text-neutral-500 mt-1 leading-normal">
                기존 상위 노출중인 블로그 포스팅의 캡쳐 이미지 또는 PDF / 원고 문서 파일<br />(글 어투, 강조 기법, 단락 스타일을 자동 정밀 분석 학습)
              </p>
            </div>
          )}

          {/* Previews */}
          {screenshots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <AnimatePresence>
                {screenshots.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square border border-brand-border rounded-lg bg-neutral-50 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] group"
                  >
                    {file.type.startsWith("image/") ? (
                      <img
                        src={file.dataUrl}
                        alt="Uploaded Review Thumbnail"
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2.5 bg-blue-50/20 text-center">
                        <span className="text-2xl mb-1">📄</span>
                        <span className="text-[9px] font-bold text-neutral-700 max-w-full truncate px-1" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[8px] text-brand-blue font-semibold mt-0.5 uppercase font-mono">
                          {file.name.split('.').pop() || "FILE"}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeScreenshot(file.id)}
                      className="absolute top-1.5 right-1.5 bg-neutral-900/80 hover:bg-neutral-900 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center transition-colors font-bold shadow-md z-10"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-neutral-900/60 text-[8px] text-white px-1 py-0.5 truncate text-center font-mono">
                      {Math.round(file.size / 1024)} KB
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* New Step 2.5: Actual Visit Photos (Ordered & Modeled for Review content) */}
        <div className="space-y-3 pt-1 border-t border-brand-border">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 text-[9px] bg-brand-orange text-white font-bold rounded-md font-mono">
                2-2
              </span>
              <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
                실제 방문 사진 (순서 지정)
              </label>
            </div>
            <span className="text-[10px] bg-brand-orange/10 px-2 py-0.5 rounded-full text-brand-orange font-bold font-mono">
              {visitImages.length}개 등록됨
            </span>
          </div>

          {/* Visit Photo Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverVisit(true);
            }}
            onDragLeave={() => setIsDragOverVisit(false)}
            onDrop={handleVisitImageDrop}
            onClick={() => visitImageInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
              isDragOverVisit
                ? "border-brand-orange bg-amber-50/20"
                : "border-neutral-200 hover:border-brand-orange hover:bg-neutral-50 bg-neutral-50/50"
            }`}
          >
            <input
              type="file"
              ref={visitImageInputRef}
              onChange={handleVisitImageChange}
              accept="image/*"
              multiple
              className="hidden"
              disabled={isLoading}
            />
            <p className="text-xs font-bold text-neutral-800">
              실물 매장 및 음식 사진 업로드
            </p>
            <p className="text-[10px] text-neutral-500 mt-1 leading-normal">
              드래그 & 선택 시 올린 순서대로<br />리뷰 내용 도중도중 설명과 함께 삽입됩니다
            </p>
          </div>

          {/* Visit Photos Render with Order badge and Move buttons */}
          {visitImages.length > 0 && (
            <div className="space-y-2 mt-2">
              <span className="text-[10px] text-brand-blue block font-bold">
                * 사진 순서 정렬 (모바일은 꾹 누른 채 드래그하거나 아래 화살표 버튼으로 정렬이 가능합니다)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnimatePresence>
                  {visitImages.map((file, idx) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      draggable={true}
                      onDragStart={(e: any) => handleDragStart(e, idx)}
                      onDragOver={(e: any) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e: any) => handleTouchStart(e, idx)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      data-sort-index={idx}
                      className={`relative border rounded-2xl shadow-sm overflow-hidden transition-all select-none aspect-square group ${
                        draggedIndex === idx || touchDraggedIndex === idx
                          ? "opacity-30 border-brand-orange scale-95 ring-2 ring-brand-orange z-20 touch-none" 
                          : "border-brand-border bg-white cursor-grab active:cursor-grabbing hover:shadow-md hover:border-brand-blue touch-pan-y"
                      }`}
                    >
                      {/* Fully Filling Image Preview */}
                      <img
                        src={file.dataUrl}
                        alt="Visit Thumbnail"
                        className="w-full h-full object-cover pointer-events-none"
                      />

                      {/* Floating Sequential Order Badge (Top-Left) */}
                      <div className="absolute top-2 left-2 bg-brand-orange text-white text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 z-10">
                        {idx + 1}
                      </div>

                      {/* Floating Delete Button (Top-Right) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVisitImage(file.id);
                        }}
                        className="absolute top-2 right-2 bg-neutral-900/60 hover:bg-neutral-900 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-110 z-10"
                        title="사진 삭제"
                      >
                        ×
                      </button>

                      {/* Mini Sort Controller Bar (Overlay Bottom Center) */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow-md border border-neutral-100 z-10 opacity-90 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveVisitImage(idx, "up");
                          }}
                          disabled={idx === 0}
                          className="text-[10px] text-neutral-700 hover:text-brand-blue hover:scale-120 disabled:opacity-20 disabled:hover:scale-100 p-0.5 cursor-pointer font-bold transition-all"
                          title="앞으로 이동"
                        >
                          ◀
                        </button>
                        <span className="w-px h-2.5 bg-neutral-200" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveVisitImage(idx, "down");
                          }}
                          disabled={idx === visitImages.length - 1}
                          className="text-[10px] text-neutral-700 hover:text-brand-blue hover:scale-120 disabled:opacity-20 disabled:hover:scale-100 p-0.5 cursor-pointer font-bold transition-all"
                          title="뒤로 이동"
                        >
                          ▶
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Step 2.6: Image Quality & Resolution Optimization (Option 1) */}
        <div className="space-y-3 pt-1 border-t border-brand-border">
          <button
            type="button"
            onClick={() => setShowAdvancedImgSettings(!showAdvancedImgSettings)}
            className="flex items-center justify-between w-full py-1.5 px-1 hover:text-brand-blue group transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500 text-white font-bold rounded-md font-mono">
                OPT
              </span>
              <span className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
                📸 이미지 해상도 및 용량 최적화 (1안 적용됨)
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 group-hover:text-brand-blue font-bold">
              {showAdvancedImgSettings ? "접기 ▲" : "재설정/상세보기 ▼"}
            </span>
          </button>

          {/* Settings panel - collapses or expands */}
          <div className={`overflow-hidden transition-all duration-300 ${showAdvancedImgSettings ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"}`}>
            <div className="bg-emerald-50/30 border border-emerald-100/70 p-4 rounded-xl space-y-4">
              
              {/* Select Resolution (max dimension) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-700 block">
                  1) 이미지 최대 해상도 제한 (가로/세로 최댓값)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1200, 1400, 1600].map((dim) => (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => setMaxImgDimension(dim)}
                      className={`py-1.5 px-1 text-[10px] font-bold rounded-lg transition-all border ${
                        maxImgDimension === dim
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                          : "bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {dim}px {dim === 1400 ? "(표준권장)" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-[9.5px] text-neutral-500 leading-normal pl-0.5">
                  네이버 모바일 뷰 최적 가독성(1400px) 및 제미나이 Vision 인쇄체 글자 식별에 특화된 표준 해상도입니다.
                </p>
              </div>

              {/* Select Quality */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-700 block">
                  2) 압축 인코딩 화질 (JPEG 압축률)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[{ val: 0.70, lbl: "경량화 (70%)" }, { val: 0.82, lbl: "표준 (82%)" }, { val: 0.92, lbl: "고화질 (92%)" }].map((q) => (
                    <button
                      key={q.val}
                      type="button"
                      onClick={() => setImgQuality(q.val)}
                      className={`py-1.5 px-1 text-[10px] font-bold rounded-lg transition-all border ${
                        imgQuality === q.val
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                          : "bg-white hover:bg-neutral-105 text-neutral-650 border-neutral-200"
                      }`}
                    >
                      {q.lbl}
                    </button>
                  ))}
                </div>
                <p className="text-[9.5px] text-neutral-500 leading-normal pl-0.5">
                  화질 저하 없이 원본 대비 용량을 최대 85% 절약하여 여러 장 업로드 시 전송 실패 현상을 영구 차단합니다.
                </p>
              </div>

              {/* Educational info cards */}
              <div className="bg-white border border-emerald-100 rounded-xl p-3 space-y-1.5 text-[9.5px] text-neutral-600 leading-relaxed font-sans">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span>💡 1안 이미지 최적화 조건 알아보기</span>
                </div>
                <div>
                  <span className="font-bold text-neutral-800">• 네이버 검색 노출 등급 (SEO):</span> 상위 노출되는 인플루언서 포스팅은 1200px ~ 1600px 가로폭 이미지를 가장 균형 있게 활용하며, 캡처본 속 글자 및 레이아웃을 네이버 AI 봇이 정밀 판독하기 매우 수월해집니다.
                </div>
                <div>
                  <span className="font-bold text-neutral-800">• AI 스캔 극대화:</span> 업로드된 우수 포스팅의 줄글/서식/어조를 무손실 스캔하기 위해 너무 크거나 작은 이미지는 1400px로 오토 스케일링하여 지능형 엔진에 무해하게 공급합니다.
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Step 3: Custom Posting Requirements & Keyword Control */}
        <div className="space-y-4 pt-1 border-t border-brand-border">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[9px] bg-brand-blue text-white font-bold rounded-md font-mono">
              03
            </span>
            <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
              리뷰 작성 기준 및 키워드 설정
            </label>
          </div>

          {/* 1) Word Count Target */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-700 block">
              1) 글자수 선택
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[1300, 1500, 2000].map((length) => (
                <button
                  key={length}
                  type="button"
                  onClick={() => setTargetLength(length)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg transition-all border ${
                    targetLength === length
                      ? "bg-brand-blue border-brand-blue text-white shadow-[0_2px_8px_rgba(0,122,255,0.2)]"
                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200"
                  }`}
                >
                  {length}자 이상
                </button>
              ))}
            </div>
          </div>

          {/* 2) Required Keywords */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-neutral-700 block">
                2) 필수 키워드 (2~3개 권장)
              </span>
              <span className="text-[9px] text-brand-blue font-bold font-mono">
                {requiredKeywords.length}개 추가됨
              </span>
            </div>
            
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="엔터 또는 추가 버튼으로 등록"
                value={requiredKeywordInput}
                onChange={(e) => setRequiredKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = requiredKeywordInput.trim();
                    if (trimmed && !requiredKeywords.includes(trimmed)) {
                      setRequiredKeywords((prev) => [...prev, trimmed]);
                      setRequiredKeywordInput("");
                    }
                  }
                }}
                disabled={isLoading}
                className="flex-1 text-xs px-3 py-2 bg-neutral-50 border border-neutral-200 focus:border-brand-blue focus:bg-white outline-none rounded-lg transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = requiredKeywordInput.trim();
                  if (trimmed && !requiredKeywords.includes(trimmed)) {
                    setRequiredKeywords((prev) => [...prev, trimmed]);
                    setRequiredKeywordInput("");
                  }
                }}
                disabled={isLoading}
                className="px-3 bg-brand-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                추가
              </button>
            </div>

            {/* Required Keywords Tags Render */}
            {requiredKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {requiredKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center text-[10px] bg-red-50 border border-red-200 text-red-600 pl-2.5 pr-1.5 py-0.5 rounded-full font-bold"
                  >
                    #{kw} (필수)
                    <button
                      type="button"
                      onClick={() => setRequiredKeywords((prev) => prev.filter((item) => item !== kw))}
                      className="ml-1 text-red-400 hover:text-red-700 text-[11px] font-extrabold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3) Optional Keywords */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-neutral-700 block">
                3) 선택 키워드
              </span>
              <span className="text-[9px] text-neutral-500 font-bold font-mono">
                {optionalKeywords.length}개 추가됨
              </span>
            </div>
            
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="엔터 또는 추가 버튼으로 등록"
                value={optionalKeywordInput}
                onChange={(e) => setOptionalKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = optionalKeywordInput.trim();
                    if (trimmed && !optionalKeywords.includes(trimmed)) {
                      setOptionalKeywords((prev) => [...prev, trimmed]);
                      setOptionalKeywordInput("");
                    }
                  }
                }}
                disabled={isLoading}
                className="flex-1 text-xs px-3 py-2 bg-neutral-50 border border-neutral-200 focus:border-brand-blue focus:bg-white outline-none rounded-lg transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = optionalKeywordInput.trim();
                  if (trimmed && !optionalKeywords.includes(trimmed)) {
                    setOptionalKeywords((prev) => [...prev, trimmed]);
                    setOptionalKeywordInput("");
                  }
                }}
                disabled={isLoading}
                className="px-3 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-bold rounded-lg hover:bg-neutral-100 transition-colors shadow-sm"
              >
                추가
              </button>
            </div>

            {/* Optional Keywords Tags Render */}
            {optionalKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {optionalKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center text-[10px] bg-neutral-100 border border-neutral-300 text-neutral-700 pl-2.5 pr-1.5 py-0.5 rounded-full font-bold"
                  >
                    #{kw}
                    <button
                      type="button"
                      onClick={() => setOptionalKeywords((prev) => prev.filter((item) => item !== kw))}
                      className="ml-1 text-neutral-400 hover:text-neutral-600 text-[11px] font-extrabold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Personal Experience & Positives */}
        <div className="space-y-3 pt-1 border-t border-brand-border animate-fade-in">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[9px] bg-brand-blue text-white font-bold rounded-md font-mono">
              04
            </span>
            <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
              나만의 특별한 개인 체험 및 좋았던 점 (선택)
            </label>
          </div>
          <p className="text-[10px] text-neutral-500 -mt-2 leading-relaxed">
            방문하셨을 때 겪었던 서비스 에피소드, 맛의 상세한 묘사, 매장의 특별했던 친절함이나 인테리어 등 강조하고 싶으신 핵심 기억을 편하게 자유 형식으로 쭉 기입해 주세요. 생성되는 리뷰 본문에 자연스럽게 녹여 드립니다.
          </p>
          <textarea
            placeholder="예: 사장님이 서비스로 주신 계란찜이 정말 폭신하고 맛있었어요! 고기가 엄청 두껍고 초벌되어서 나와 육즙이 가득했으며, 직원분들이 직접 구워주셔서 끝까지 편하게 식사할 수 있었던 부분이 최고였습니다."
            value={personalExperience}
            onChange={(e) => setPersonalExperience(e.target.value)}
            disabled={isLoading}
            rows={4}
            className="w-full text-xs p-3 bg-neutral-50 border border-neutral-200 outline-none rounded-lg resize-none focus:border-brand-blue focus:bg-white focus:ring-1 focus:ring-brand-blue transition-all leading-relaxed"
          />
        </div>

        {/* Big high contrast launch button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative py-4 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-neutral-200 disabled:text-neutral-400 transition-all font-mono tracking-wider flex items-center justify-center overflow-hidden shadow-[0_8px_20px_rgba(0,82,255,0.15)] hover:shadow-[0_8px_24px_rgba(0,82,255,0.25)]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-xs tracking-widest font-sans font-bold animate-pulse">
                  알고리즘 및 가이드 학습 가공 중...
                </span>
              </div>
            ) : (
              "블로그 리뷰 본문 생성하기"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
