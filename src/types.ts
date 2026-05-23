/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Version: 1.0.4 - Touch Drag & SEO scoring optimized
 */

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // base64 representation
}

export type ReviewTone = "neutral" | "friendly" | "analytical" | "detailed" | "emotional";

export interface ReviewGenerationParams {
  storeName: string;
  storeCategory: string;
  tone: ReviewTone;
  keywords: string[];
  guidelines: string; // The guidelines text loaded from the uploaded file or manually written
}

export interface ReviewHistoryItem {
  id: string;
  storeName: string;
  storeCategory: string;
  tone: ReviewTone;
  keywords: string[];
  generatedText: string;
  createdAt: string;
}
