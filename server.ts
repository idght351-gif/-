/**
 * Naver Blog Review Generator Server
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Lazy-loaded Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Settings > Secrets panel of AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express JSON parser with higher limits to support base64 screenshot images
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));

  // API Route: Generate review using Gemini API
  app.post("/api/generate-review", async (req, res) => {
    try {
      const {
        storeName,
        storeCategory,
        tone = "neutral",
        keywords: rawKeywords,
        guidelines = "",
        images: rawImages,
        visitImages: rawVisitImages,
        guidelineImages: rawGuidelineImages,
      } = req.body;

      // Defensive checking for arrays
      const keywords = Array.isArray(rawKeywords) ? rawKeywords : [];
      const images = Array.isArray(rawImages) ? rawImages : [];
      const visitImages = Array.isArray(rawVisitImages) ? rawVisitImages : [];
      const guidelineImages = Array.isArray(rawGuidelineImages) ? rawGuidelineImages : [];

      let ai;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        return res.status(400).json({
          error: "API Key Missing",
          message: err.message,
        });
      }

      // Convert screenshots to Gemini inline data
      const screenshotParts = images
        .filter((imgStr: any) => typeof imgStr === "string" && imgStr)
        .map((imgStr: string) => {
          let mimeType = "image/png";
          let base64Data = imgStr;

          if (imgStr.startsWith("data:")) {
            const match = imgStr.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }

          return {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
        });

      // Convert ordered visit images to Gemini inline data
      const visitParts = visitImages
        .filter((imgObj: any) => imgObj && imgObj.dataUrl)
        .map((imgObj: any) => {
          let mimeType = "image/png";
          let base64Data = imgObj.dataUrl;

          if (base64Data.startsWith("data:")) {
            const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }

          return {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
        });

      // Convert guideline images/PDFs/files to Gemini inline data
      const guidelineParts = guidelineImages
        .filter((imgStr: any) => typeof imgStr === "string" && imgStr)
        .map((imgStr: string) => {
          let mimeType = "image/png";
          let base64Data = imgStr;

          if (imgStr.startsWith("data:")) {
            const match = imgStr.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }

          return {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
        });

      // Assemble tone description
      // Users requested to delete step 5 and use the default natural blog influencer tone referencing excellent reviews
      const toneGuide = "인위적이지 않고 대단히 세련되면서도 친근한 네이버 인플루언서 톤앤매너. 함께 업로드된 [우수 리뷰 캡쳐 이미지 및 원고 파일/PDF]의 실제 문체, 단락 유입 방식, 구어체/해요체 어구 믹싱, 이모지 기법, 강조 패턴을 집중 스캔하여 100% 동일하게 사람 냄새 나는 리얼한 우수 포스팅 어투를 고도로 복사/재현해야 합니다.";

      // Prepare descriptive listing of upload sequence to aid the instruction
      const visitMetaInfo = visitImages.map((img: any, idx: number) => {
        return `- [실제첨부 사진 ${idx + 1}]: 파일명 "${img.name}" (실제 업로드 순서대로 ${idx + 1}번째 위치해야 함)`;
      }).join("\n");

      const promptText = `
# Role: 네이버 블로그 상위 노출 및 마케팅 전문 카피라이터 (Blog Optimization Expert)

# Purpose:
사용자가 제공한 방문 정보 및 우수 리뷰 캡쳐본 이미지, 가이드라인 파일, 그리고 **[실제 방문 매장/음식 사진들]**을 고도로 다층 분석하여 네이버 검색 알고리즘(C-Rank, DIA+) 조건에 최적화된 고품질 블로그 원고를 생성합니다.

# 대상 정보:
1. 대상 가게/업체명: ${storeName || "미지정 (작성시 문맥에 맞게 보정)"}
2. 카테고리/업종: ${storeCategory || "일반 업종"}
3. 타겟 톤앤매너: ${toneGuide}
4. 사용자 지정 키워드: ${keywords.length > 0 ? keywords.join(", ") : "지정 없음 (3번 가이드라인 텍스트 및 우수리뷰 이미지에서 자동 추출하여 학습 적용)"}
5. 작성 가이드라인 (체험단 상위 누락 방지 조건):
${guidelines || "특별한 가이드 기준 없음 (자연스러운 칭찬과 상세 정보 포함)"}

6. 사용자가 등록한 실제 사진 업로드 순서 목록 (순서 100% 준수):
${visitMetaInfo || "등록된 본문 실물 사진 없음 (자연스러운 일러스트 가이드 적용)"}

# Core Vision & Text Keyword Learning Instruction:
- **⭐ 핵심 지시 (가이드라인 글 및 이미지 내 키워드 오토 추출):** 3번에 업로드된 [리뷰작성 가이드라인 텍스트 파일], [가이드라인 캡처 이미지], [우수리뷰 파일/PDF/캡쳐 스크린샷 이미지] 속에 포함된 텍스트와 노출 권장 키워드(예: "OO맛집, OO추천, OO역맛집" 등 강조 문구 및 글귀)를 비전 및 다층분석 기술로 **전부 정밀 추출하여 스스로 학습**하세요. 학습된 핵심 키워드 리스트를 제목과 본문 요소곳곳에 **5~8회씩 완벽히 자연스럽게** 녹여내야 합니다.
- 함께 송신된 **우수 리뷰 스크린샷 및 참고용 파일/PDF**들을 통해, 글 단락 나누기 호흡법, 유용한 강조 볼드 처리 기법을 분석 학습하여 이식하세요.
- **실제 업로드된 실물 사진들(사진 순서 1, 2, 3...)**이 있을 경우, Gemini 비전 기술로 각 이미지의 디자인, 색상, 음식 비주얼, 내부 매장 상태 등을 현실성 있게 파악하여 본문에 극찬 스토리로 세부 묘사하세요. 
- 예: "고기가 노릇하게 구워진 1번 사진을 보시면 대박이죠", "2번 사진처럼 매장 분위기가 아주 모던해서..." 등, 실제 사진 내용을 소름 돋게 설명에 녹여주어 단순 줄글이 아닌 '진짜 영수증 리뷰어' 같은 포스를 풍기게 하세요.

# Core Writing Principles:
1. **체류 시간 확보**: 독자의 체류 시간(2분 이상) 확보를 위해 가독성이 높고 꼼꼼한 정보 위주로 서술하세요.
2. **실제 경험 중심 (DIA+ 우대)**: 기계적인 자동 생성 느낌을 완전히 지우고, 저자가 직접 방문하여 체험한 자연스럽고 솔직한 친근한 어조(해요체 중심)를 사용해 주세요.
3. **도입부 이펙트**: 무의미한 형식적인 일상 인사말("안녕하세요 누구입니다 등")은 완전 생략하고, 첫 문단에서 사용자가 얻을 핵심 이득과 주요 셀링포인트를 바로 제시해 이탈을 방지하세요.
4. **시각적 섹션화**: 네이버 AI가 글의 구조를 쉽게 이해하도록 마크다운 인용구나 구분선을 활용하여 소제목별로 세련되게 섹션을 분리하세요.
5. **특수문자 금지 규칙 (상단 및 본문 공통)**: 검색 봇의 스팸 분류 예방을 위해 특수문자(예: ★, ⭕, ■, 📢)의 남발을 금지하며 절대 사용하지 마십시오.

---

# 원고 작성 프로세스 및 템플릿 구조 (반드시 준수할 것):

### [1. 제목 생성]
- 제목 매칭 공식: [핵심 조합 키워드] + [셀링 포인트/특징] + [후기/내돈내산 등]
- 규정: 사용자 지정 키워드가 없을 경우 스스로 '중소형 롱테일 키워드(예: ${storeName || "지역명"} + 메뉴 + 특징)'들을 기획하여 제목 및 본문에 5~8회 자연스럽게 녹이세요. 제목 글자 수는 20~35자 내외로 가장 깔끔해야 합니다.

### [2. 도입부 (첫 3~5줄)]
- 형식적인 일상 안부는 배제하고, 장소의 메인 셀링포인트를 기강 잡는 강력한 핵심 어필로 시작하여 이탈률을 가둡니다.

### [3. 본문 세부 섹션화]
각 대별 단락(소제목)의 이름은 반드시 아래 양식 그대로 큰따옴표(“ ”)로 감싸고, 바로 아랫줄에 마크다운 수평선(---)을 넣어 완벽한 밑줄 구분 처리를 지켜주세요. 

양식 예시:
“식당 위치 및 주차 안내”
---

이 양식(큰따옴표와 아랫줄의 마크다운 소구분선 ---)을 절대 공통 준수하십시오. 별표(*)나 헤더 우물정(#) 표시를 전후에 섞지 마세요.
또한 독자 유지율 목적의 '표(Table)'를 삽입하라는 팁/가이드는 전부 삭제(지양)되었으므로, 대표 메뉴판 정보와 메뉴 및 가격은 표가 아니라 자연스럽게 풀어진 문장 또는 간단하고 이쁜 텍스트 목록 형식으로만 기재해야 합니다.

사용자가 올린 실제 사진들을 순서대로 알맞게 매칭하여 다음과 같은 문장 포맷으로 본문 중간에 위치해야 합니다:

“매장 위치 및 주차 안내”
---
- 길안내 및 주차 꿀팁을 수록하여 자세히 작성하세요. 
- 첫 번째 사진을 여기에 매칭하세요: \`[실제첨부 사진 1: \${visitImages[0]?.name || "매장 외관 및 간판"}]\` (이미지 특성 묘사 기재)

“아늑한 매장 내부 분위기”
---
- 매장의 특별한 내부 감성, 인테리어 구조, 청결도 등을 생생하게 묘사하세요. 절대 표를 만들지 마세요.
- 두 번째 사진을 여기에 매칭하세요: \`[실제첨부 사진 2: \${visitImages[1]?.name || "아늑한 매장 내부 인테리어"}]\` (인테리어 및 청결성 묘사 기재)

“오늘의 추천 메뉴 솔직 시식평”
---
- 직접 맛보고 경험하는 풍미와 쫄깃함, 매장 고유의 조리 매력을 생생히 기술하세요.
- 세 번째 및 이후 사진들을 여기에 순차적으로 배치하세요: 
  \`[실제첨부 사진 3: \${visitImages[2]?.name || "대표 요리의 영롱한 비주얼"}]\` (음식 생김새와 플레이팅 묘사 기재)
- 만약 올린 사진이 4개 이상이면, 자연스럽게 글 중간중간에 순서대로 다 넣어주세요.

### [4. 총평 및 방문 꿀팁 (마무리)]
“솔직 총평 및 요약 꿀팁”
---
- 대기 시간 최소화 팁 등의 꿀팁과 별점(5점 만점 기준)으로 마무리하세요.

### [5. 키워드 분석 및 소통 리포트]
블록 형태로 깔끔하게 삽입해 주세요. (특수 기호 사용은 배격)
- **키워드 반복 분석**: 사용된 타겟 검색용 키워드 명칭과 본문 내 실질 반복 횟수 (5~8회 준수 여부 점검)
- **이웃 전용 대댓글 가이드**: 이웃들이 댓글 소통을 걸어왔을 때 타겟 키워드를 자연스럽게 기용하여 답글을 남길 수 있는 소통용 대댓글 모음 2개 제안

정답 원고는 모바일 환경에서 한눈에 깔끔하게 읽히고 가장 독사하기 편하도록 고급스러운 Markdown 스타일로 일체의 잡스러운 텍스트를 배제하고 산뜻하게 작성하세요.
`;

      // Pack system contents and screenshot images if available
      const parts: any[] = [];
      
      // 1. Add style screenshots / PDFs / reference files
      screenshotParts.forEach((part: any) => {
        parts.push(part);
      });

      // 2. Add guideline captures / files
      guidelineParts.forEach((part: any) => {
        parts.push(part);
      });

      // 3. Add ordered real visit images
      visitParts.forEach((part: any) => {
        parts.push(part);
      });

      // 4. Add text prompt
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: parts,
          }
        ],
        config: {
          temperature: 0.8,
          systemInstruction: "당신은 네이버 최고 등급의 맛집/카페/라이프스타일 상위 노출 전문 카피라이터 대행 파워블로거입니다. 특히 사용자가 제공한 실물 사진의 순서와 시각적 가치를 정확히 감정하고 문맥에 맞게 글과 사진이 교차 배치되는 완성도 높은 모바일 최적화 포스팅 원고를 책임집니다.",
        }
      });

      const text = response.text || "";

      return res.json({
        reviewText: text,
        success: true
      });

    } catch (error: any) {
      console.error("Generate review error:", error);
      return res.status(500).json({
        success: false,
        error: "Generation Failed",
        message: error.message || "리뷰 생성 도중 에러가 발생했습니다."
      });
    }
  });

  // API Route: Analyze Guideline Image/PDF to extract text guidelines
  app.post("/api/analyze-guideline", async (req, res) => {
    try {
      const { fileDataUrl, fileName } = req.body;
      if (!fileDataUrl) {
        return res.status(400).json({ error: "No file data provided" });
      }

      let ai;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        return res.status(400).json({
          error: "API Key Missing",
          message: err.message,
        });
      }

      let mimeType = "image/png";
      let base64Data = fileDataUrl;

      if (fileDataUrl.startsWith("data:")) {
        const match = fileDataUrl.match(/^data:([^;]+).*;base64,(.+)$/);
        if (match) {
          mimeType = match[1].toLowerCase();
          base64Data = match[2];
        }
      }

      const promptText = `
업로드된 가이드라인 이미지 또는 참고 자료 이미지 [${fileName || "가이드 파일"}]를 읽고, 리뷰를 작성할 때 꼭 지켜야 하는 조건과 기법을 정밀 분석해 주세요.

## 다음 항목들을 빠짐없이 찾아서 한글로 요약 보고서 형태로 추출해 주세요:
1. **타겟 키워드 / 필수 노출 키워드** (예: @@맛집, @@추천 등 강조해야 할 단어들)
2. **글 필수 조건 및 강조 사항** (예: 지도 삽입 여부, 사진 개수 만족선, 글자수 제한, 영상 필수 첨부 정보, 특정 글귀 명시 등)
3. **금지 제한 요소** (예: 가격 노출 불가, 특정 단어 사용 금지, 대가가 없는 척 내돈내산 강요 금지 등)
4. **리뷰 핵심 소구점 / 가이드라인 포인트** (예: 음식 비주얼 극찬, 인테리어 모던함 강조 등)

반드시 한글로 작성해 주세요.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: promptText },
            ],
          }
        ],
        config: {
          temperature: 0.1, // Low temp for accurate text extraction
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reportText: {
                type: Type.STRING,
                description: "가이드라인 내용들을 대제목/소제목 및 목록 기호로 한글화하여 잘 정돈한 마크다운 양식 요약 텍스트"
              },
              extractedKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "가이드 이미지/문서 내에서 반드시 제목이나 본문에 들어가야 할 대표 노출 조건 검색 키워드 단어들 (예: '홍대맛집', '라멘추천'). '#' 기호나 공백, 따옴표 없이 순수한 완성형 단어로 추출해야 합니다."
              }
            },
            required: ["reportText", "extractedKeywords"]
          }
        }
      });

      const responseText = response.text || "";
      let parsedResult = { reportText: "", extractedKeywords: [] as string[] };
      try {
        parsedResult = JSON.parse(responseText);
      } catch (err) {
        console.error("JSON parsing of guideline extraction failed, fallback text search", err);
        parsedResult = {
          reportText: responseText,
          extractedKeywords: []
        };
      }

      return res.json({ 
        success: true, 
        text: parsedResult.reportText || responseText,
        keywords: parsedResult.extractedKeywords || []
      });
    } catch (error: any) {
      console.error("Analyze guideline error:", error);
      return res.status(500).json({
        success: false,
        error: "Analysis Failed",
        message: error.message || "가이드라인 분석 도중 오류가 발생했습니다."
      });
    }
  });

  // Enable Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static assets in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
