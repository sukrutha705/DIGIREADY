/**
 * DigiReady - Real OCR & Image Quality Contracts
 * Phase 11: Truthful document image OCR extraction, quality inspection, and provider abstraction.
 */

export interface OCRTextBlock {
  text: string;
  confidence: number; // 0 to 1
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRResult {
  text: string;
  confidence: number; // 0 to 1
  lines: string[];
  blocks?: OCRTextBlock[];
  warnings: string[];
}

export type ImageQualityStatus =
  | "IMAGE_VALID"
  | "IMAGE_LOW_QUALITY"
  | "IMAGE_UNREADABLE"
  | "IMAGE_NO_TEXT"
  | "IMAGE_REQUIRES_REVIEW";

export interface ImageQualityResult {
  status: ImageQualityStatus;
  isValid: boolean;
  width?: number;
  height?: number;
  fileSize: number;
  mimeType: string;
  warnings: string[];
  details?: string;
}

export interface OCRProvider {
  extractText(imageBuffer: Buffer, mimeType?: string): Promise<OCRResult>;
}
