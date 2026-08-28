import { OCRProvider, OCRResult } from "./types";

/**
 * OCR Recognition Timeout in milliseconds.
 * Applies specifically to worker.recognize() on an image.
 */
export const OCR_RECOGNIZE_TIMEOUT_MS = 10_000;

/**
 * Maximum longest dimension for the OCR working copy.
 * Images larger than this are resized in-memory before OCR; the original is never modified.
 */
export const OCR_MAX_DIMENSION_PX = 1800;

/**
 * FIFO concurrency queue for OCR operations.
 * A single Tesseract worker must not run multiple recognize() calls simultaneously.
 */
class OCRQueue {
  private queue: Array<() => void> = [];
  private running = false;

  enqueue(fn: () => Promise<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await fn();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      this.drain();
    });
  }

  private drain(): void {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const next = this.queue.shift()!;
    Promise.resolve()
      .then(() => next())
      .finally(() => {
        this.running = false;
        this.drain();
      });
  }
}

const ocrQueue = new OCRQueue();

/**
 * Singleton Tesseract worker state.
 * Created once and reused across all requests in the process lifetime.
 */
let singletonWorker: any = null;
let workerInitializing: Promise<any> | null = null;

export async function getOrCreateWorker(): Promise<any> {
  if (singletonWorker) return singletonWorker;

  if (workerInitializing) {
    return workerInitializing;
  }

  const tStart = Date.now();
  workerInitializing = (async () => {
    try {
      const { createWorker, PSM } = await import("tesseract.js");

      // Turbopack rewrites both __dirname AND require.resolve to virtual paths at bundle time,
      // which breaks Tesseract.js's worker_threads Worker instantiation (requires absolute path).
      // We use process.cwd() which is always the real project root at Node.js runtime,
      // combined with the known relative path to the Tesseract worker script.
      const path = await import("path");
      const fs = await import("fs");
      let workerPathOption: Record<string, string> = {};
      const candidatePath = path.join(
        process.cwd(),
        "node_modules",
        "tesseract.js",
        "src",
        "worker-script",
        "node",
        "index.js"
      );
      try {
        await fs.promises.access(candidatePath);
        workerPathOption = { workerPath: candidatePath };
        console.info(`[OCR] resolved workerPath: ${candidatePath}`);
      } catch {
        console.warn("[OCR] Could not find workerPath at", candidatePath, "— using default");
      }

      const worker = await createWorker("eng", 1, {
        ...workerPathOption,
        errorHandler: (err: any) => {
          console.warn("[OCR] Tesseract worker handled error:", err?.message || err);
          singletonWorker = null;
          workerInitializing = null;
        },
      });

      // PSM 6: SINGLE_BLOCK (assume single uniform block of text for document images)
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      singletonWorker = worker;
      workerInitializing = null;
      console.info(`[OCR] worker-ready: ${Date.now() - tStart}ms (initialization)`);
      return worker;
    } catch (err) {
      singletonWorker = null;
      workerInitializing = null;
      console.error("[OCR] Failed to initialize Tesseract worker:", err);
      throw err;
    }
  })();

  return workerInitializing;
}

/**
 * Safely terminate and reset the singleton worker only when explicitly needed or on crash.
 */
async function resetWorker(): Promise<void> {
  const w = singletonWorker;
  singletonWorker = null;
  workerInitializing = null;
  if (w) {
    try {
      await w.terminate();
    } catch {
      // ignore termination errors
    }
  }
}

/**
 * Runs OCR on the given buffer with a dedicated recognition timeout.
 * Queues the operation so concurrent uploads never race on the same worker.
 * Returns an empty result on timeout or error — never fabricates text.
 */
async function runOCRWithTimeout(imageBuffer: Buffer): Promise<OCRResult> {
  let result: OCRResult = {
    text: "",
    confidence: 0,
    lines: [],
    warnings: [],
  };

  await ocrQueue.enqueue(async () => {
    // 1. Ensure worker is ready before starting the recognize timeout race
    const tInitStart = Date.now();
    let worker: any = null;
    try {
      worker = await getOrCreateWorker();
    } catch (workerErr) {
      console.warn("[OCR] Worker initialization unavailable in serverless environment, falling back safely:", workerErr instanceof Error ? workerErr.message : workerErr);
      result = {
        text: "",
        confidence: 0,
        lines: [],
        warnings: [
          "OCR processing engine unavailable in this serverless environment. Document recorded safely for review.",
        ],
      };
      return;
    }
    const initElapsed = Date.now() - tInitStart;

    // 2. Start recognition timeout race
    const tRecogStart = Date.now();
    const recognizePromise = worker.recognize(imageBuffer);

    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), OCR_RECOGNIZE_TIMEOUT_MS);
    });

    let ret: any = null;
    try {
      ret = await Promise.race([recognizePromise, timeoutPromise]);
    } catch (err) {
      console.error("[OCR] Recognition error occurred:", err);
      await resetWorker();
      result = {
        text: "",
        confidence: 0,
        lines: [],
        warnings: [
          "Could not read text from document image due to an unreadable or corrupt format.",
        ],
      };
      return;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const recogElapsed = Date.now() - tRecogStart;

    if (ret === null) {
      // Recognition timed out — do not destroy the worker unless it is broken
      console.warn(`[OCR] recognition: timed out after ${OCR_RECOGNIZE_TIMEOUT_MS}ms`);
      result = {
        text: "",
        confidence: 0,
        lines: [],
        warnings: [
          `OCR_TIMEOUT: We couldn't finish reading this image. Try a clearer, well-lit document photo.`,
        ],
      };
      return;
    }

    const rawText: string = ret?.data?.text || "";
    const rawConfidence: number = (ret?.data?.confidence || 0) / 100;

    console.info(`[OCR] worker-ready: ${initElapsed}ms`);
    console.info(`[OCR] recognition: ${recogElapsed}ms (chars: ${rawText.length}, conf: ${(rawConfidence * 100).toFixed(1)}%)`);

    const lines = rawText
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const warnings: string[] = [];
    if (lines.length === 0 || rawText.trim().length === 0) {
      warnings.push("No readable textual content could be detected in this document image.");
    } else if (rawConfidence < 0.4) {
      warnings.push("Low OCR confidence score. Text may be partially degraded or blurry.");
    }

    result = {
      text: rawText.trim(),
      confidence: rawText.trim().length > 0 ? Math.max(0.1, rawConfidence) : 0,
      lines,
      warnings,
    };
  });

  return result;
}

/**
 * Resizes an image buffer so its longest side is at most OCR_MAX_DIMENSION_PX,
 * using Sharp. Returns the original buffer if Sharp is unavailable
 * or if the image is already within bounds.
 *
 * IMPORTANT: This function never modifies the caller's original buffer.
 * The returned buffer is a separate in-memory copy used only for OCR.
 */
export async function prepareOCRWorkingCopy(
  imageBuffer: Buffer,
  _mimeType: string
): Promise<Buffer> {
  if (imageBuffer.length < 500) {
    return imageBuffer;
  }

  try {
    const sharp = (await import("sharp")).default;

    // Get dimensions first (cheap metadata read)
    const metadata = await sharp(imageBuffer).metadata();
    const { width = 0, height = 0 } = metadata;

    let pipeline = sharp(imageBuffer).rotate(); // auto-rotate based on EXIF

    if (width > OCR_MAX_DIMENSION_PX || height > OCR_MAX_DIMENSION_PX) {
      pipeline = pipeline.resize({
        width: OCR_MAX_DIMENSION_PX,
        height: OCR_MAX_DIMENSION_PX,
        fit: "inside",      // never upscale, preserves aspect ratio
        withoutEnlargement: true,
      });
    }

    // Grayscale + normalize for optimal Tesseract character contrast
    const processed = await pipeline
      .grayscale()
      .normalize()
      .jpeg({ quality: 90 })
      .toBuffer();

    return processed;
  } catch (err) {
    console.warn("[OCR] Sharp preprocessing fallback, using original buffer for OCR:", err);
    return imageBuffer;
  }
}

/**
 * LocalTesseractOCRProvider
 */
export class LocalTesseractOCRProvider implements OCRProvider {
  async extractText(imageBuffer: Buffer, _mimeType?: string): Promise<OCRResult> {
    if (!imageBuffer || imageBuffer.length < 200) {
      return {
        text: "",
        confidence: 0,
        lines: [],
        warnings: ["Image buffer is empty or too small for OCR processing."],
      };
    }

    try {
      return await runOCRWithTimeout(imageBuffer);
    } catch (err) {
      console.error("[OCR] Unexpected error during OCR:", err);
      await resetWorker();
      return {
        text: "",
        confidence: 0,
        lines: [],
        warnings: [
          "Could not read text from document image due to an unreadable or corrupt format.",
        ],
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level provider singleton
// ---------------------------------------------------------------------------

let defaultOCRProvider: OCRProvider | null = null;

export function getOCRProvider(): OCRProvider {
  if (!defaultOCRProvider) {
    defaultOCRProvider = new LocalTesseractOCRProvider();
  }
  return defaultOCRProvider;
}

export function setOCRProvider(provider: OCRProvider): void {
  defaultOCRProvider = provider;
}

/**
 * Exposed for testing only — allows direct inspection of singleton worker state.
 * @internal
 */
export function _getWorkerForTest(): any {
  return singletonWorker;
}

export function _resetWorkerForTest(): Promise<void> {
  return resetWorker();
}
