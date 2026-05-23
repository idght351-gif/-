/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";

interface WritingTipsPanelProps {
  onApplyPreset: (rules: string) => void;
}

export function WritingTipsPanel({ onApplyPreset }: WritingTipsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    {
      title: "🔥 DIA+ 노출 극대화 가이드 (표준)",
      rules: `[네이버 DIA+ 로직 최적화 필수 지침]
- 첫 세줄에서 불필요한 일기식 일상의 인사말은 건너뛰고 바로 본론을 제시하세요.
- 매장의 특징적인 셀링포인트(예: 주차가능여부, 고기 구워주는 식당 등)를 확실히 알립니다.
- 제공하는 모든 메뉴와 가격은 보기 편하게 반드시 [표(Table)] 형태로 정리해서 인입해 주세요.
- 실제 방문 사진들을 글과 혼합하여 1번, 2번, 3번 순서대로 매끄럽게 이야기로 묘사합니다.`
    },
    {
      title: "✍️ 감성 브이로그 맛집 스토리텔링",
      rules: `[감성 에세이 형식 템플릿 지침]
- 딱딱한 상업성 광고투를 100% 버리고 고요하고 분위기 있는 일기식 서정 어조(~했다 체)를 사용합니다.
- 조도가 낮은 조명이나 매장의 재즈 음악, 흘러나오던 분위기와 정적인 테이블 배치를 풍부히 묘사하세요.
- 첫 디쉬가 완성되어 서빙되었을 때 마주한 은은한 오감(맛, 시각, 촉각, 향기) 위주로 문단 간격을 넓게 주어 독자의 인스타 감성을 유도합니다.`
    },
    {
      title: "📊 인플루언서식 초정밀 정보 분석형",
      rules: `[성실 분석형 파워블로거 템플릿 지침]
- 가성비, 접근성, 위생, 맛, 대기난이도 5가지 지표를 수치와 논리적인 팩트 위주로 대조 분석합니다.
- 대기 시 꿀팁(캐치테이블, 테이블링 예약 등), 매장 인접 가성비 공영 주차장 요금과 도보 거리 등 첫 방문자에게 가장 실질적인 팁을 가공해 전달합니다.
- 장점뿐만 아니라 아쉬운 점이나 미리 숙지하면 좋은 리스크 팁을 지혜롭게 섞어 리얼 백퍼센트의 체험 가치를 증대시킵니다.`
    }
  ];

  return (
    <div className="border border-brand-border rounded-xl bg-neutral-50 overflow-hidden text-xs transition-all duration-300">
      
      {/* Header Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white hover:bg-neutral-50 flex justify-between items-center transition-colors border-b border-brand-border"
      >
        <div className="flex items-center gap-1.5 font-bold text-neutral-800">
          <span className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
          <span>💡 네이버 상위노출 작성 비밀 가이드</span>
        </div>
        <span className="text-[10px] text-brand-blue font-bold font-mono">
          {isOpen ? "▲ 접기" : "▼ 펼쳐보기 (기법 추천)"}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 bg-white divide-y divide-brand-border">
          
          {/* Method Info Guides */}
          <div className="space-y-2 pb-3">
            <h4 className="font-bold text-neutral-900 text-xs">포스팅 성공을 위한 4가지 수칙</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-600 leading-normal">
              <div className="p-2.5 bg-brand-bg/40 border border-brand-border rounded-lg">
                <span className="font-bold text-brand-blue block mb-0.5">1. 제목 첫단에 키워드</span>
                검색 노출 타겟 롱테일 키워드는 항상 제목의 가장 왼쪽에 배치하세요.
              </div>
              <div className="p-2.5 bg-brand-bg/40 border border-brand-border rounded-lg">
                <span className="font-bold text-brand-blue block mb-0.5">2. 기계적인 특수문자 금지</span>
                ★, ⭕, ■ 같은 남발형 이모지는 검색 스팸 필터링 유발 대상입니다.
              </div>
              <div className="p-2.5 bg-brand-bg/40 border border-brand-border rounded-lg">
                <span className="font-bold text-brand-blue block mb-0.5">3. 표(Table)로 가독성 UP</span>
                메뉴 목록이나 가격 지수를 Markdown 표로 구성해 이탈률을 방지합니다.
              </div>
              <div className="p-2.5 bg-brand-bg/40 border border-brand-border rounded-lg">
                <span className="font-bold text-brand-blue block mb-0.5">4. 실제 사진 설명 일치</span>
                동반 기재한 실제 방문 이미지와 텍스트 묘사를 긴밀하게 엮을 때 가중치를 받습니다.
              </div>
            </div>
          </div>

          {/* Quick apply presets */}
          <div className="pt-3 space-y-2">
            <div>
              <h4 className="font-bold text-neutral-900 text-xs">작성기법 템플릿 기준 원클릭 적용</h4>
              <p className="text-[10px] text-neutral-400">클릭하시면 아래 가이드라인 편집창에 전문가 표준 양식이 즉시 세팅됩니다.</p>
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onApplyPreset(preset.rules);
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 border border-neutral-200 hover:border-brand-blue rounded-xl hover:bg-blue-50/10 transition-colors flex justify-between items-center bg-white shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-neutral-800 block text-xs truncate">{preset.title}</span>
                    <span className="text-[9px] text-neutral-400 truncate max-w-[240px] block mt-0.5 font-mono">
                      {preset.rules.split("\n")[1]}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono shrink-0 pl-2.5 text-brand-blue font-bold border-l border-brand-border/60 ml-2">
                    즉시 세팅 →
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
