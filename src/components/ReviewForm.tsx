/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
}

export function ReviewForm({ onGenerate, isLoading }: ReviewFormProps) {
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

  // New: Handle visit images uploads with sequential ordering
  const processVisitImageFiles = (files: FileList) => {
    const filesToProcess = Array.from(files).filter((file) => file.type.startsWith("image/"));

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const newUploaded: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: reader.result,
          };
          setVisitImages((prev) => [...prev, newUploaded]);
        }
      };
      reader.readAsDataURL(file);
    });
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

  // Handle guidelines document/screenshot upload (supports txt, docx, pdf, png, jpg etc.)
  const processDocFile = (file: File) => {
    // If it is an image or PDF, read it as Data URL as well and add to guidelineImages state for Gemini to read natively!
    if (file.type.startsWith("image/") || file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const newUploaded: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type || "application/pdf",
            dataUrl: reader.result,
          };
          setGuidelineImages((prev) => [...prev, newUploaded]);
        }
      };
      reader.readAsDataURL(file);
    }

    setGuidelinesFileName(file.name);
    
    // Auto-populate description in the textbox
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === "string") {
          setGuidelinesText(e.target.result);
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith("image/")) {
      setGuidelinesText((prev) => {
        const banner = `[${file.name} 가이드라인 이미지가 시각 분석용으로 업로드되었습니다.]`;
        return prev ? `${prev}\n${banner}` : banner;
      });
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setGuidelinesText((prev) => {
        const banner = `[${file.name} 가이드라인 PDF 문서가 다층 분석용으로 업로드되었습니다.]`;
        return prev ? `${prev}\n${banner}` : banner;
      });
    } else {
      setGuidelinesText(
        `[${file.name} 가이드라인 파일이 분석용으로 등록되었습니다.]\n본문에 들어갈 필수 문구, 금지어, 필수 첨부 키워드 등을 직접 추가로 편집해 주시면 리뷰 반영 완성도가 더욱 매끄러워집니다.`
      );
    }
  };

  const handleDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processDocFile(e.target.files[0]);
    }
  };

  const handleDocDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processDocFile(e.dataTransfer.files[0]);
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
                * 사진 순서 정렬 (버튼으로 위치를 조정할 수 있습니다)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <AnimatePresence>
                  {visitImages.map((file, idx) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative p-2.5 border border-brand-border rounded-xl bg-white shadow-sm flex items-center gap-2 overflow-hidden"
                    >
                      {/* Order Badge (Accent Orange LockBox Style) */}
                      <div className="w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 shadow-sm">
                        {idx + 1}
                      </div>

                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-brand-border">
                        <img
                          src={file.dataUrl}
                          alt="Seq Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className="text-[10px] text-neutral-700 truncate font-bold font-mono block">
                          {file.name}
                        </span>
                        {/* Sort Controller */}
                        <div className="flex gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => moveVisitImage(idx, "up")}
                            disabled={idx === 0}
                            className="px-1.5 py-0.2 bg-white border border-neutral-200 hover:border-brand-blue disabled:opacity-30 rounded text-[9px] font-bold text-neutral-600 transition-colors shadow-sm"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            onClick={() => moveVisitImage(idx, "down")}
                            disabled={idx === visitImages.length - 1}
                            className="px-1.5 py-0.2 bg-white border border-neutral-200 hover:border-brand-blue disabled:opacity-30 rounded text-[9px] font-bold text-neutral-600 transition-colors shadow-sm"
                          >
                            ▶
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeVisitImage(file.id)}
                        className="text-neutral-400 hover:text-red-500 text-sm font-bold p-1 absolute top-1 right-1"
                      >
                        ×
                      </button>
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
            <span className="text-[10px] font-bold text-neutral-500 block">
              가이드라인 원고 반영 텍스트 편집
            </span>
            <textarea
              placeholder="파일 내용이나 작성 팁이 이곳에 자동 입력되며, 수동 보정도 가능합니다."
              value={guidelinesText}
              onChange={(e) => setGuidelinesText(e.target.value)}
              disabled={isLoading}
              rows={4}
              className="w-full text-xs p-3 bg-neutral-50 border border-neutral-200 focus:border-brand-blue focus:bg-white outline-none rounded-lg resize-none font-mono transition-colors focus:ring-1 focus:ring-brand-blue"
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

        {/* Step 5: Post Tone selection */}
        <div className="space-y-3 pt-1 border-t border-brand-border">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[9px] bg-brand-blue text-white font-bold rounded-md font-mono">
              05
            </span>
            <label className="text-xs font-bold tracking-wide text-neutral-800 uppercase block">
              블로그 톤앤매너 스타일
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "friendly", label: "친근 발랄 (일상형)", desc: "상냥한 인사 & 이모지 혼용" },
              { id: "detailed", label: "초정밀 정보형", desc: "이용 팁 수록 성실 분석" },
              { id: "emotional", label: "감성 브이로그", desc: "분위기 감성 정갈 서사" },
              { id: "analytical", label: "논리적 정보형", desc: "객관성 기반 철저한 비교" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTone(item.id as ReviewTone)}
                disabled={isLoading}
                className={`text-left p-3 border rounded-xl transition-all ${
                  tone === item.id
                    ? "border-brand-blue bg-blue-50/20 text-brand-blue shadow-[0_4px_12px_rgba(0,82,255,0.04)]"
                    : "border-neutral-200 hover:border-brand-blue hover:bg-neutral-50/55 bg-white"
                }`}
              >
                <div className={`text-xs font-bold ${tone === item.id ? "text-brand-blue" : "text-neutral-800"}`}>
                  {item.label}
                </div>
                <div className="text-[9px] text-neutral-400 mt-1 leading-none">{item.desc}</div>
              </button>
            ))}
          </div>
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
