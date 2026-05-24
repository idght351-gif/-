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

// Safe base64 data url parser to prevent catastrophic backtracking (ReDoS) on large uploads
function parseDataUrl(dataUrl: string) {
  let mimeType = "image/png";
  let dataToUse = dataUrl;

  if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex !== -1) {
      const meta = dataUrl.substring(0, commaIndex);
      dataToUse = dataUrl.substring(commaIndex + 1);
      
      const mimeMatch = meta.match(/^data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1].toLowerCase();
      }
    }
  }

  return { mimeType, dataToUse };
}

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
        personalExperience = "",
        images: rawImages,
        visitImages: rawVisitImages,
        guidelineImages: rawGuidelineImages,
        targetLength = 1300,
        requiredKeywords: rawReqKeywords,
        optionalKeywords: rawOptKeywords,
      } = req.body;

      // Defensive checking for arrays
      const keywords = Array.isArray(rawKeywords) ? rawKeywords : [];
      const images = Array.isArray(rawImages) ? rawImages : [];
      const visitImages = Array.isArray(rawVisitImages) ? rawVisitImages : [];
      const guidelineImages = Array.isArray(rawGuidelineImages) ? rawGuidelineImages : [];
      const requiredKeywords = Array.isArray(rawReqKeywords) ? rawReqKeywords : [];
      const optionalKeywords = Array.isArray(rawOptKeywords) ? rawOptKeywords : [];

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
          const { mimeType, dataToUse } = parseDataUrl(imgStr);
          return {
            inlineData: {
              mimeType,
              data: dataToUse,
            },
          };
        });

      // Convert ordered visit images to Gemini inline data
      const visitParts = visitImages
        .filter((imgObj: any) => imgObj && imgObj.dataUrl)
        .map((imgObj: any) => {
          const { mimeType, dataToUse } = parseDataUrl(imgObj.dataUrl);
          return {
            inlineData: {
              mimeType,
              data: dataToUse,
            },
          };
        });

      // Convert guideline images/PDFs/files to Gemini inline data (kept for backward fallback)
      const guidelineParts = guidelineImages
        .filter((imgStr: any) => typeof imgStr === "string" && imgStr)
        .map((imgStr: string) => {
          const { mimeType, dataToUse } = parseDataUrl(imgStr);
          return {
            inlineData: {
              mimeType,
              data: dataToUse,
            },
          };
        });

      // Assemble tone description
      const toneGuide = "인위적이지 않고 대단히 세련되면서도 친근한 네이버 인플루언서 톤앤매너. 함께 업로드된 [우수 리뷰 캡쳐 이미지 및 원고 파일/PDF]가 있을 경우 실제 문체, 단락 유입 방식, 구어체/해요체 어구 믹싱, 이모지 기법, 강조 패턴을 집중 스캔하여 100% 동일하게 사람 냄새 나는 리얼한 우수 포스팅 어투를 고도로 복사/재현해야 합니다.";

      // Prepare descriptive listing of upload sequence to aid the instruction
      const visitMetaInfo = visitImages.map((img: any, idx: number) => {
        return `- [실제첨부 사진 ${idx + 1}]: 파일명 "${img.name}" (실제 업로드 순서대로 ${idx + 1}번째 위치해야 함)`;
      }).join("\n");

      const promptText = `
<SYSTEM_PROMPT_HARNESS>
  <ROLE>네이버 최고 등급의 맛집/카페/라이프스타일 상위 노출 전문 카피라이터 대행 파워블로거</ROLE>
  <MISSION>사용자가 입력한 정보(가게명, 카테고리, 실제 방문 사진 목록, 키워드 조건, 글자 수 타겟)를 100% 매칭하여 네이버 검색 알고리즘(C-Rank, DIA+)에 완벽 규합하는 최고 등급의 모바일 최적화 블로그 원고를 생성한다.</MISSION>
  
  <STORE_CONTEXT>
    - 가게명: ${storeName || "미지정 (작성시 문맥에 맞게 보정)"}
    - 업종/카테고리: ${storeCategory || "일반 업종"}
    - 타겟 톤앤매너: ${toneGuide}
    - 작성 권장 최소 글자수: ${targetLength}자 이상 (최대 만족 및 내용 전개 필수)
    - 나만의 체험 에피소드 및 강점 기억: ${personalExperience || "특별한 에피소드 없음 (본문 가이드와 올린 실사 인테리어 및 맛을 분석하여 실감나게 채울 것)"}
  </STORE_CONTEXT>

  <KEYWORD_CONTROL_SYSTEM>
    <REQUIRED_KEYWORDS>
      - 리스트: [ ${requiredKeywords.length > 0 ? requiredKeywords.join(", ") : "지정 없음"} ]
      - 조건: 필수 키워드는 원고 제목에 자연스럽게 포함되고, 본문의 전체 단락 구조 속에서 각각 최소 "3회 이상" 대단히 부드러운 연결구 형태로 믹싱되어 반복 반영되어야 한다. 절대로 단순 나열이나 스팸 문체로 작성하지 마라.
    </REQUIRED_KEYWORDS>
    <OPTIONAL_KEYWORDS>
      - 리스트: [ ${optionalKeywords.length > 0 ? optionalKeywords.join(", ") : "지정 없음"} ]
      - 조건: 본문 내용의 흐름을 보조하며 칭찬을 가미할 때 자연스런 스토리라인에 맞추어 1~2회식 유연하게 수록하도록 제어한다.
    </OPTIONAL_KEYWORDS>
  </KEYWORD_CONTROL_SYSTEM>

  <VISIT_PHOTOS_COORDINATOR>
    - 실제 등록된 사진 목록 및 업로드 순서:
    ${visitMetaInfo || "등록된 실물 사진 없음"}
    
    - 이미지 매칭 규칙: 각 사진의 시각적 형태(비주얼, 구도, 메뉴 비주얼 등)를 감정해서 모바일 독자가 실제로 읽어내려가는 듯한 현장감 넘치는 시식/체험 에세이로 교차 배치하라.
    - 본문 삽입 시 엄격한 마크다운 가이드라인 포맷 수록 준수: \`[실제첨부 사진 N: 파일명]\`
  </VISIT_PHOTOS_COORDINATOR>

  <FORMAT_TEMPLATES>
    ### [1. 제목 생성]
    - 공식: [필수 키워드 반영 조합] + [최고 장점/인상적인 특징] + [내돈내산 혹은 주관적 방문 후기 정서 추가]
    - 길이: 모바일 시인성에 최적화되도록 20~35자 내외로 가장 깔끔하게 생성.

    ### [2. 도입부]
    - 불필요한 일기식 안부말("안녕하세요 ~입니다")은 100% 생략하여 신속히 이탈률을 가둔다.
    - 가게 명의 위치적 편의성, 첫 이미지, 예약 팁 또는 기대감을 강력히 선사하며 시작한다.

    ### [3. 소제목 정밀 분할 레이아웃]
    네이버 AI 검색 봇이 문서의 구성력을 우수하게 판독하도록, 주요 헤더 구분선은 반드시 아래 소괄호 양식 그대로 구성하고 바로 아랫줄에 마크다운 분할선(---)을 넣어 주어라:
    
    양식 예시:
    “식당 위치 및 주차 안내”
    ---
    “아늑한 매장 내부 분위기”
    ---
    “오늘의 추천 메뉴 솔직 시식평”
    ---
    “솔직 총평 및 요약 꿀팁”
    ---

    - 주의: 헤더에 우물정(#)이나 단순 두꺼운 별표(**)를 섞지 말 것. 본문의 흐름에 맞춰 실제 사진들을 차례대로 소제목 단락 하단에 교차 삽입하라.
    - 예시:
      “식당 위치 및 주차 안내”
      ---
      주소와 찾아오시는 꿀팁을 수록하고 첫 번째 사진인 \`[실제첨부 사진 1: 파일명]\` 을 삽입하여 묘사한다.
      
      “아늑한 매장 내부 분위기”
      ---
      내부 무드와 친절도, 메뉴판 전개를 담고 두 번째 사진인 \`[실제첨부 사진 2: 파일명]\` 을 삽입하여 묘사한다.
      
      “오늘의 추천 메뉴 솔직 시식평”
      ---
      사용자가 전달한 나만의 에피소드 및 메뉴의 미트질, 구워진 솜씨, 양념의 풍미 등을 극찬하며 세 번째 사진인 \`[실제첨부 사진 3: 파일명]\` 과 이후 사진들을 알차게 연계해 설명한다.

    - 추가: 독자 유지시간 확보를 목적으로 존재하던 표(Table) 형태 소개 가이드는 가독성을 저해하므로 금지한다. 메뉴판 구성은 줄글 에세이 형태 또는 텍스트 점 리스트로만 깔끔하게 나열할 것.
  </FORMAT_TEMPLATES>

  <NEGATIVE_CONSTRAINTS>
    1. 검색 누락을 방지하기 위해 상업적 광고 티가 나는 과도하거나 기계적인 특수문자(★, ⭕, ■, 📢 등)의 절대 사용 금지.
    2. 어법 불일치 및 자동 생성기 같은 단순 앵무새 문장 반복 금지.
    3. 지정된 권장 글자 수 목표인 최소 ${targetLength}자 이상을 풍선처럼 부풀리지 않고, 실제 맛의 감각적인 디테일과 유용한 꿀정보들로 대단히 풍성하게 서술하여 다 채워줄 것!
  </NEGATIVE_CONSTRAINTS>

  <POST_WRITE_ANALYSIS_BLOCK>
    - 원고의 하단부에 이웃들과 유익한 소통을 이어갈 수 있는 '이웃 전용 대댓글 가이드 리포트' 2종 제안. (특수 유치문구 배격)
    - 사용된 필수 키워드의 실질 본문 반복 카운트 self-audit 검증 보고서 작성 수록.
  </POST_WRITE_ANALYSIS_BLOCK>
</SYSTEM_PROMPT_HARNESS>
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

  // Only mount dev server/listen under standard environments (e.g. Cloud Run, local development)
  // and NOT when imported inside a Vercel Serverless environment
  if (!process.env.VERCEL) {
    const startStandardServer = async () => {
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
    };
    startStandardServer();
  }

  export default app;
