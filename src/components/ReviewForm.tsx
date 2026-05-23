/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
 */

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadedFile, ReviewTone, ReviewGenerationParams } from "../types";
import { AnimatePresence, motion } from "motion/react";
import { WritingTipsPanel } from "./WritingTipsPanel";

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
  const [guidelinesText, setGuidelinesText] = useState("");
  const [guidelinesFileName, setGuidelinesFileName] = useState("");
  
  // Keyword tags list
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  // Screenshots (2~3 files to learn best quality blog formats)
  const [screenshots, setScreenshots] = useState<UploadedFile[]>([]);
  
  // Guideline uploads for step 3 (can accept screenshots/images as well as doc files)
  const [guidelineImages, setGuidelineImages] = useState<UploadedFile[]>([]);
  
  // New: Actual Visit Photos (ordered 1, 2, 3... to be placed sequentially inside the review)
  const [visitImages, setVisitImages] = useState<UploadedFile[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const visitImageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop states
  const [isDragOverImage, setIsDragOverImage] = useState(false);
  const [isDragOverVisit, setIsDragOverVisit] = useState(false);
  const [isDragOverDoc, setIsDragOverDoc] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Touch drag states for mobile sorting
  const [touchDraggedIndex, setTouchDraggedIndex] = useState<number | null>(null);
  const touchTimeoutRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const [isAnalyzingGuideline, setIsAnalyzingGuideline] = useState(false);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const newUploaded: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "text/plain"),
            dataUrl: reader.result,
          };
          setScreenshots((prev) => [...prev, newUploaded].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // New: Handle visit images uploads with sequential ordering (preserving exact selection order)
  const processVisitImageFiles = async (files: FileList) => {
    const filesToProcess = Array.from(files).filter((file) => file.type.startsWith("image/"));
    
    const loadedFilesPromises = filesToProcess.map((file) => {
      return new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl: reader.result,
            });
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
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

  const removeGuidelineImage = (id: string) => {
    setGuidelineImages((prev) => prev.filter((item) => item.id !== id));
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

  // Handle guidelines document/screenshot upload (supports txt, docx, pdf, png, jpg etc.)
  const processDocFiles = async (files: FileList | File[]) => {
    const filesArray = Array.from(files);
    if (!filesArray.length) return;

    // Append file names
    setGuidelinesFileName((prev) => {
      const names = filesArray.map(f => f.name);
      return prev ? `${prev}, ${names.join(", ")}` : names.join(", ");
    });

    for (const file of filesArray) {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result && typeof e.target.result === "string") {
            setGuidelinesText((prev) => {
              const header = `■ [문서 가이드: ${file.name}]\n`;
              return prev ? `${prev}\n\n${header}${e.target.result}` : `${header}${e.target.result}`;
            });
          }
        };
        reader.readAsText(file);
      } else if (file.type.startsWith("image/") || file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            if (typeof reader.result === "string") {
              const fileDataUrl = reader.result;
              const newUploaded: UploadedFile = {
                id: crypto.randomUUID(),
                name: file.name,
                size: file.size,
                type: file.type || "application/pdf",
                dataUrl: fileDataUrl,
              };
              setGuidelineImages((prev) => [...prev, newUploaded]);

              // Start visual/text extraction analysis via Gemini API
              setIsAnalyzingGuideline(true);
              const loadingBanner = `[✨ AI 모델이 '${file.name}' 가이드라인을 스캔하여 글의 핵심 규칙 목록을 정밀 분석하는 중입니다...]`;
              setGuidelinesText((prev) => {
                return prev ? `${prev}\n\n${loadingBanner}` : loadingBanner;
              });

              try {
                const response = await fetch("/api/analyze-guideline", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    fileDataUrl,
                    fileName: file.name,
                  }),
                });
                const data = await response.json();
                if (data.success && data.text) {
                  setGuidelinesText((prev) => {
                    const cleaned = prev.replace(loadingBanner, "").trim();
                    const contentText = `■ 가이드 및 우수리뷰 [${file.name}] AI 정밀 추출 기준:\n${data.text}`;
                    return cleaned ? `${cleaned}\n\n${contentText}` : contentText;
                  });

                  // Add keywords to step 4 keywords state list safely
                  if (data.keywords && Array.isArray(data.keywords)) {
                    const cleanedExtracted = data.keywords
                      .map((k: string) => k.replace(/#/g, "").trim())
                      .filter((k: string) => k.length > 0);

                    if (cleanedExtracted.length > 0) {
                      setKeywords((prev) => {
                        const merged = [...prev];
                        cleanedExtracted.forEach((k: string) => {
                          if (!merged.includes(k)) {
                            merged.push(k);
                          }
                        });
                        return merged;
                      });
                    }
                  }
                } else {
                  setGuidelinesText((prev) => {
                    const cleaned = prev.replace(loadingBanner, "").trim();
                    const errorBanner = `[⚠️ '${file.name}' 가이드 이미지 상세 분석 실패: ${data.message || "알 수 없는 오류"}]`;
                    return cleaned ? `${cleaned}\n\n${errorBanner}` : errorBanner;
                  });
                }
              } catch (err: any) {
                setGuidelinesText((prev) => {
                  const cleaned = prev.replace(loadingBanner, "").trim();
                  const errorBanner = `[⚠️ '${file.name}' 분석 연동 실패: ${err.message || "연결이 마이크로하게 지연되었습니다"}]`;
                  return cleaned ? `${cleaned}\n\n${errorBanner}` : errorBanner;
                });
              } finally {
                setIsAnalyzingGuideline(false);
                resolve();
              }
            } else {
              resolve();
            }
          };
          reader.readAsDataURL(file);
        });
      } else {
        setGuidelinesText((prev) => {
          const itemText = `[${file.name} 가이드라인 파일이 분석용으로 등록되었습니다.]\n본문에 들어갈 필수 문구, 금지어, 필수 첨부 키워드 등을 직접 추가로 편집해 주시면 리뷰 반영 완성도가 더욱 매끄러워집니다.`;
          return prev ? `${prev}\n\n${itemText}` : itemText;
        });
      }
    }
  };

  const handleDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processDocFiles(e.target.files);
    }
  };

  const handleDocDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverDoc(false);
    if (e.dataTransfer.files) {
      processDocFiles(e.dataTransfer.files);
    }
  };

  // Handle Keyword tag creation
  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setKeywordInput("");
    }
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((item) => item !== kw));
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName) {
      alert("가게/업체명을 입력해 주세요.");
      return;
    }

    const payload: ReviewGenerationParams = {
      storeName,
      storeCategory,
      tone,
      keywords,
      guidelines: guidelinesText,
    };

    const imgDataUrls = screenshots.map((s) => s.dataUrl);
    const visitImgList = visitImages.map((s) => ({
      id: s.id,
      name: s.name,
      dataUrl: s.dataUrl,
    }));
    const guidelineImgDataUrls = guidelineImages.map((g) => g.dataUrl);
    onGenerate(payload, imgDataUrls, visitImgList, guidelineImgDataUrls);
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

        {/* Step 3: Guidelines File upload */}
        <div className="space-y-3 pt-1 border-t border-brand-border">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[9px] bg-brand-blue text-white font-bold rounded-md font-mono">
              03
            </span>
            <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
              리뷰작성기준 및 기법 가이드
            </label>
          </div>

          <WritingTipsPanel onApplyPreset={(rules) => setGuidelinesText(rules)} />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverDoc(true);
            }}
            onDragLeave={() => setIsDragOverDoc(false)}
            onDrop={handleDocDrop}
            onClick={() => docInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all duration-200 ${
              isDragOverDoc
                ? "border-brand-blue bg-blue-50/10"
                : "border-neutral-200 hover:border-brand-blue bg-neutral-50"
            }`}
          >
            <input
              type="file"
              ref={docInputRef}
              onChange={handleDocChange}
              accept=".txt,.doc,.docx,.pdf,.hwp,image/*"
              className="hidden"
              multiple
              disabled={isLoading}
            />
            {guidelinesFileName ? (
              <div className="text-xs font-bold text-brand-blue flex items-center justify-center gap-1.5">
                <span className="truncate max-w-[240px] font-mono">📄 {guidelinesFileName}</span>
                <span className="text-[9px] text-neutral-400 font-normal">(변경하려면 클릭)</span>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-neutral-800">
                  리뷰 가이드라인 분석 파일 및 캡처 이미지 업로드
                </p>
                <p className="text-[10px] text-neutral-500 mt-1 leading-normal">
                  체험단 필수 안내 사항문서 (.txt, .docx, .pdf) 또는 가이드 캡처 스크린샷 이미지
                </p>
              </div>
            )}
          </div>

          {/* Guideline Screenshots / PDF Previews */}
          {guidelineImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              <AnimatePresence>
                {guidelineImages.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square border border-brand-border rounded-lg bg-neutral-50 overflow-hidden shadow-sm group"
                  >
                    {file.type.startsWith("image/") ? (
                      <img
                        src={file.dataUrl}
                        alt="Uploaded Guideline"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1.5 bg-blue-50/10 text-center">
                        <span className="text-lg">📄</span>
                        <span className="text-[8px] font-bold text-neutral-700 max-w-full truncate px-0.5" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[7.5px] text-brand-blue font-bold uppercase mt-0.5 font-mono">
                          {file.name.split('.').pop() || "FILE"}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeGuidelineImage(file.id)}
                      className="absolute top-1 right-1 bg-neutral-900/80 hover:bg-neutral-900 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center transition-colors font-bold shadow-sm z-10"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Guidelines Text Editor Pre-populate / Edit Area */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-neutral-500">
                가이드라인 원고 반영 텍스트 편집
              </span>
              {isAnalyzingGuideline && (
                <span className="flex items-center gap-1 text-brand-orange font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-ping" />
                  AI 이미지 텍스트 추출 분석 중...
                </span>
              )}
            </div>
            <textarea
              placeholder="파일 내용이나 작성 팁이 이곳에 자동 입력되며, 수동 보정도 가능합니다."
              value={guidelinesText}
              onChange={(e) => setGuidelinesText(e.target.value)}
              disabled={isLoading || isAnalyzingGuideline}
              rows={6}
              className={`w-full text-xs p-3 bg-neutral-50 border outline-none rounded-lg resize-none font-mono transition-all focus:ring-1 ${
                isAnalyzingGuideline 
                  ? "border-brand-orange ring-1 ring-brand-orange bg-amber-50/5 text-neutral-500" 
                  : "border-neutral-200 focus:border-brand-blue focus:bg-white focus:ring-brand-blue"
              }`}
            />
          </div>
        </div>

        {/* Step 4: SEO Key phrases / Keywords to target */}
        <div className="space-y-3 pt-1 border-t border-brand-border">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 text-[9px] bg-brand-blue text-white font-bold rounded-md font-mono">
                04
              </span>
              <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
                네이버 SEO 검색 키워드
              </label>
            </div>
            <span className="text-[10px] text-brand-orange font-bold">
              ★3번 가이드에 있으면 자동분석
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 -mt-2 leading-relaxed">
            비전 AI 모델이 가이드 파일 및 참고 리뷰 이미지 속의 키워드를 자동으로 학습하여 강조 삽입합니다. 추가 희망 시 아래에 지정해 주십시오.
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="예: 홍대맛집, 삼겹살맛집 (엔터로 추가)"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyPress}
              disabled={isLoading}
              className="flex-1 text-xs px-3 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-brand-blue focus:bg-white outline-none rounded-lg transition-all focus:ring-1 focus:ring-brand-blue"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              disabled={isLoading}
              className="px-4 bg-brand-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              추가
            </button>
          </div>

          {/* Keyword tags render */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center text-[10px] bg-blue-50/50 border border-blue-100 text-brand-blue pl-2.5 pr-2 py-0.5 rounded-full font-bold"
                >
                  #{kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="ml-1.5 text-neutral-400 hover:text-neutral-700 text-[11px] font-extrabold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>



        {/* Big high contrast launch button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading || !storeName}
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
