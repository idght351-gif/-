/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import Markdown from "react-markdown";

interface ReviewOutputProps {
  generatedText: string;
  onReset: () => void;
  storeName: string;
}

export function ReviewOutput({ generatedText, onReset, storeName }: ReviewOutputProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Helper to split title from body for individual copying
  // Usually, title is at the top like "# [제목] ~~~" or "**제목**: ~~~"
  const parseContent = () => {
    const lines = generatedText.split("\n");
    let title = "";
    let bodyLines: string[] = [];
    let isExtractingTitle = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for custom title markups or markdown header
      if (line.startsWith("#") || line.toLowerCase().includes("제목") || line.startsWith("**[제목]**") || line.startsWith("[제목]")) {
        // Clean up markdown markers
        title = line.replace(/^#\s*/, "").replace(/^[제목]:\s*/, "").replace(/^\*\*\[제목\]\*\*:\s*/, "").replace(/^\[제목\]\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, "");
        isExtractingTitle = true;
        continue;
      }
      
      // If we haven't found a title but want to capture the first non-empty line as backup if it looks of a title length
      if (!title && line && line.length < 80 && i < 5) {
        title = line;
        continue;
      }

      bodyLines.push(lines[i]);
    }

    const bodyText = bodyLines.join("\n").trim();
    return {
      title: title || `${storeName} 고품질 네이버 블로그 리뷰`,
      body: bodyText || generatedText,
    };
  };

  const { title, body } = parseContent();

  // Dynamic Metrics for SEO recommendation
  const charWithSpaces = generatedText.length;
  const charWithoutSpaces = generatedText.replace(/\s+/g, "").length;
  
  // Calculate specific SEO elements
  const photoCount = (generatedText.match(/\[실제첨부 사진|\[사진/g) || []).length;
  const hasTable = generatedText.includes("|") && generatedText.split("|").length > 4;
  const codeHighlights = (generatedText.match(/\*\*[^*]+\*\*/g) || []).length;

  const handleDownloadTxt = () => {
    try {
      const formattedText = `[네이버 블로그 기획 원고]\n\n■ 제목: ${title}\n\n■ 본문 원고:\n${body}\n\n-----------------------------\n* 본문 내 [실제첨부 사진] 표시를 확인하시어 해당 실물 사진을 교차 배치해 주십시오.`;
      const blob = new Blob([formattedText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `[블로그원고]_${storeName || "리뷰"}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyTitle = async () => {
    try {
      await navigator.clipboard.writeText(title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="flex flex-col p-6 space-y-6">
      
      {/* Header */}
      <div className="text-center pb-5 border-b border-brand-border">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-brand-blue font-bold tracking-wide text-[10px] rounded-full uppercase mb-2">
          <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-pulse" />
          Synthesis Complete
        </div>
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          신디사이즈 완료 원고
        </h2>
        <p className="text-[11.5px] text-neutral-500 mt-1">
          네이버블로그 규격에 맞게 기획된 맞춤형 원고안입니다
        </p>
      </div>

      {/* Copy Actions Hub */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleCopyTitle}
          className="py-3 px-2 border border-neutral-200 hover:border-brand-blue hover:text-brand-blue text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md"
        >
          <span className="text-neutral-700 hover:text-brand-blue font-bold">제목만 복사</span>
          <span className="text-[9px] text-neutral-400 font-normal mt-0.5">
            {copiedTitle ? "✓ 완료" : "클릭"}
          </span>
        </button>
        <button
          onClick={handleCopyBody}
          className="py-3 px-2 border border-neutral-200 hover:border-brand-blue hover:text-brand-blue text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md"
        >
          <span className="text-neutral-700 hover:text-brand-blue font-bold">본문만 복사</span>
          <span className="text-[9px] text-neutral-400 font-normal mt-0.5">
            {copiedBody ? "✓ 완료" : "클릭"}
          </span>
        </button>
        <button
          onClick={handleCopyAll}
          className="py-3 px-2 bg-brand-blue text-white hover:bg-blue-700 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(0,82,255,0.15)] hover:shadow-[0_4px_16px_rgba(0,82,255,0.25)]"
        >
          <span>전체 복사</span>
          <span className="text-[9px] text-blue-100 font-normal mt-0.5">
            {copiedAll ? "✓ 전체완료" : "원클릭"}
          </span>
        </button>
      </div>

      {/* Recommended New: Dynamic Text Analyzer Panel */}
      <div className="border border-brand-border rounded-2xl p-4 bg-brand-bg/50 flex flex-col space-y-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
        <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
            📊 원고 정밀 진단 통계
          </span>
          <button
            onClick={handleDownloadTxt}
            className="px-2.5 py-1.5 bg-white border border-neutral-250 hover:border-brand-blue hover:text-brand-blue text-[9px] font-bold rounded-lg text-neutral-700 transition-colors shadow-sm"
          >
            📥 TXT 파일 다운로드
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-2.5 bg-white border border-brand-border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-[9px] text-neutral-400 block font-bold">공백 포함</span>
            <span className="text-xs font-mono font-bold text-brand-blue mt-0.5 block">{charWithSpaces.toLocaleString()}자</span>
          </div>
          <div className="p-2.5 bg-white border border-brand-border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-[9px] text-neutral-400 block font-bold">공백 제외</span>
            <span className="text-xs font-mono font-bold text-neutral-800 mt-0.5 block">{charWithoutSpaces.toLocaleString()}자</span>
          </div>
          <div className="p-2.5 bg-white border border-brand-border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-[9px] text-neutral-400 block font-bold">포지션 사진</span>
            <span className="text-xs font-mono font-bold text-brand-orange mt-0.5 block">{photoCount}개</span>
          </div>
        </div>

        {/* Dynamic SEO Quality Audit List */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-bold text-brand-blue block uppercase tracking-wider">
            ✨ 상위 노출 스코어링 자가 진단
          </span>
          <div className="space-y-1.5 text-[10px] text-neutral-600 leading-relaxed bg-white p-3 rounded-xl border border-brand-border">
            <div className="flex items-start gap-2">
              <span className={`shrink-0 text-[9px] px-1.5 py-0.2 rounded font-bold ${charWithSpaces >= 1200 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                {charWithSpaces >= 1200 ? "패스" : "부족"}
              </span>
              <span>
                본문 분량: 현재 {charWithSpaces}자 ({charWithSpaces >= 1200 ? "지표 유지율이 우수하게 보장됩니다." : "1,200자 이상 확보를 강력하게 권장합니다."})
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className={`shrink-0 text-[9px] px-1.5 py-0.2 rounded font-bold ${photoCount >= 3 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                {photoCount >= 3 ? "양호" : "추천"}
              </span>
              <span>
                사진 매칭: {photoCount}개 ({photoCount >= 3 ? "단락 간 호흡과 배치 밸런스가 좋습니다." : "3개 블록 이상의 이미지 배치를 권정합니다."})
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className={`shrink-0 text-[9px] px-1.5 py-0.2 rounded font-bold ${hasTable ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-500"}`}>
                {hasTable ? "적용" : "정보"}
              </span>
              <span>
                이용 정보: {hasTable ? "메뉴 리스트가 일목요연한 표 가독성을 확보했습니다." : "메뉴/가격 표가 빠졌습니다. (상위 글 작성 시 삽입 권장)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Naver Blog Simulation Viewport */}
      <div className="border border-brand-border rounded-2xl p-4 bg-white shadow-sm space-y-4 max-h-[460px] overflow-y-auto leading-relaxed">
        
        {/* Simulating Naver Blog Header Info */}
        <div className="pb-3 border-b border-neutral-100 flex justify-between items-center text-[10px] text-neutral-400 font-mono">
          <span>NAVER BLOG EDITOR PREVIEW</span>
          <span className="text-brand-blue">Category: Review Synth</span>
        </div>

        {/* Clean render of Title */}
        <div className="bg-blue-50/20 border border-blue-100/70 rounded-xl p-3.5">
          <div className="text-[9px] text-brand-blue font-bold uppercase tracking-wider mb-1 font-mono">
            ★ 네이버 최적화 블로그 제목
          </div>
          <h3 className="text-sm font-bold text-neutral-900 leading-snug">{title}</h3>
        </div>

        {/* Render Generated Body Text with customized css bindings */}
        <div className="markdown-body text-xs text-neutral-800 space-y-3 prose prose-sm prose-stone max-w-none">
          <Markdown>{body}</Markdown>
        </div>
      </div>

      {/* Copy warning / instructions */}
      <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-100 flex flex-col gap-1.5 text-[11px] text-neutral-600 leading-relaxed shadow-sm">
        <span className="font-bold text-brand-orange flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
          💡 네이버 랭킹 업로드 공략
        </span>
        <span className="pl-3 relative before:content-['•'] before:absolute before:left-0 text-neutral-650">복사한 원고를 블로그에 에디터에 자연스럽게 삽입하세요.</span>
        <span className="pl-3 relative before:content-['•'] before:absolute before:left-0 text-neutral-650">원고 내 지정된 <span className="font-bold text-brand-blue bg-blue-50 px-1 py-0.2 rounded">[사진 X]</span> 가이드 위치마다 실제 소유하고 계신 촬영 이미지를 삽입하세요. 이미지의 유일성이 높을수록 정합도와 점수가 대폭 향상됩니다.</span>
      </div>

      {/* Main Buttons */}
      <div className="pt-2">
        <button
          onClick={onReset}
          className="w-full py-4 border border-brand-blue text-brand-blue font-bold text-xs rounded-xl hover:bg-blue-50/40 transition-all font-mono tracking-wide shadow-sm"
        >
          ← 새로운 우수 리뷰 학습/생성하기
        </button>
      </div>
    </div>
  );
}
