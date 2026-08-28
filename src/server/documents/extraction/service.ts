import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { detectDocumentType } from "./detection";
import { extractFieldsForDocument } from "./extractor";
import {
  ProcessUploadOptions,
  ProcessUploadResult,
  UploadValidationResult,
  UserFieldCorrection,
} from "./types";
import { verifyDocument } from "@/server/verification/verifier";
import { getVaultConsistencyAssessment } from "@/server/consistency/service";
import { getApplicationJourney } from "@/server/journey/service";
import { UserNotFoundError } from "@/server/readiness";
import { normalizeName, normalizeDob, normalizeGender, normalizeParentName } from "@/server/consistency/policy";
import { getOCRProvider, inspectImageQuality, prepareOCRWorkingCopy } from "@/server/documents/ocr";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates file buffer magic bytes, size, and MIME type.
 * Only JPEG, PNG, and WEBP are accepted. PDFs, text files, etc. are rejected before OCR.
 */
export function validateImageUpload(
  buffer: Buffer,
  fileName: string,
  declaredMimeType?: string
): UploadValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Upload file is empty." };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File size exceeds the 10 MB limit." };
  }

  // 1. Magic bytes validation — this must run before OCR to prevent non-image processing
  let detectedMimeType: string | null = null;
  let detectedExtension: string | null = null;

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedMimeType = "image/jpeg";
    detectedExtension = "jpg";
  }
  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedMimeType = "image/png";
    detectedExtension = "png";
  }
  // WEBP: "RIFF" (0..3) ... "WEBP" (8..11)
  else if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    detectedMimeType = "image/webp";
    detectedExtension = "webp";
  }

  if (!detectedMimeType) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a valid image file (JPEG, PNG, or WEBP).",
    };
  }

  return {
    valid: true,
    mimeType: detectedMimeType,
    fileSize: buffer.length,
    detectedExtension: detectedExtension || "jpg",
  };
}

/**
 * Ensures the private server-side uploads directory exists.
 */
async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}

/**
 * Finds or creates the UNKNOWN DocumentType record in the database for unidentified documents.
 */
async function getOrCreateUnknownDocumentType(db: PrismaClient): Promise<string> {
  const existing = await db.documentType.findUnique({
    where: { canonicalKey: "UNKNOWN" },
  });
  if (existing) return existing.id;

  const created = await db.documentType.create({
    data: {
      canonicalKey: "UNKNOWN",
      displayName: "Unidentified Document",
      category: "OTHER",
      description: "Unidentified uploaded document requiring manual classification.",
    },
  });
  return created.id;
}

/**
 * Processes a document image upload with:
 *  1. Magic-byte validation (rejects non-images before OCR)
 *  2. Quality short-circuit (blank/unreadable images skip OCR)
 *  3. Original image stored unchanged on disk
 *  4. In-memory resized OCR working copy (max 1800px) via Sharp
 *  5. Single OCR pass through the singleton Tesseract worker (queued, with timeout)
 *  6. Evidence-based document detection
 *  7. Evidence-based field extraction (never fabricates values)
 *  8. Batched database writes
 *  9. Verification + consistency + journey updates
 *
 * NEVER invents, hardcodes, or defaults document metadata.
 */
export async function processDocumentUpload(
  fileBuffer: Buffer,
  fileName: string,
  declaredMimeType: string,
  userId: string,
  options: ProcessUploadOptions = {},
  db: PrismaClient = prisma
): Promise<ProcessUploadResult> {
  const t0 = Date.now();
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    return { success: false, error: "User ID is required." };
  }

  // ── 1. User validation ──────────────────────────────────────────────────
  const user = await db.user.findUnique({ where: { id: trimmedUserId } });
  if (!user) {
    throw new UserNotFoundError(trimmedUserId);
  }

  // ── 2. Validate image buffer and format ─────────────────────────────────
  const tVal = Date.now();
  const validation = validateImageUpload(fileBuffer, fileName, declaredMimeType);
  if (!validation.valid || !validation.mimeType || !validation.detectedExtension) {
    return { success: false, error: validation.error || "Invalid image file." };
  }
  console.info(`[OCR] validation: ${Date.now() - tVal}ms`);

  // ── 3. Store ORIGINAL image immediately on validation ───────────────────
  // The original fileBuffer bytes are stored byte-for-byte unchanged on disk.
  const tStore = Date.now();
  await ensureUploadsDir();
  const fileKey = `upload_${crypto.randomUUID()}.${validation.detectedExtension}`;
  const filePath = path.join(UPLOADS_DIR, fileKey);
  await fs.writeFile(filePath, fileBuffer);
  console.info(`[OCR] storage: ${Date.now() - tStore}ms`);

  // ── 4. Image quality short-circuit (fast, synchronous) ──────────────────
  // Run BEFORE OCR to immediately short-circuit blank or unreadable images.
  const quality = inspectImageQuality(fileBuffer, validation.mimeType);

  let ocrResult = {
    text: "",
    confidence: 0,
    lines: [] as string[],
    warnings: [] as string[],
  };

  const shouldSkipOCR =
    quality.status === "IMAGE_UNREADABLE" || quality.status === "IMAGE_NO_TEXT";

  if (shouldSkipOCR) {
    // Blank or completely unreadable — skip OCR entirely for speed
    ocrResult.warnings.push(
      "Image quality check: document appears blank or unreadable. We couldn't find enough document evidence."
    );
    console.info(`[OCR] preprocessing: 0ms (skipped: ${quality.status})`);
  } else {
    // ── 5. Prepare in-memory OCR working copy (resized) ───────────────────
    // Original fileBuffer is NEVER modified. The resized copy is used ONLY for OCR.
    const tResize = Date.now();
    const ocrBuffer = await prepareOCRWorkingCopy(fileBuffer, validation.mimeType);
    console.info(`[OCR] preprocessing: ${Date.now() - tResize}ms`);

    // ── 6. Single OCR pass ─────────────────────────────────────────────────
    const ocrProvider = getOCRProvider();
    ocrResult = await ocrProvider.extractText(ocrBuffer, "image/jpeg");
  }

  // ── 7. Detect Document Type from Evidence ──────────────────────────────
  const tDetect = Date.now();
  const detection = await detectDocumentType(
    fileName,
    ocrResult.text,
    options.documentTypeOverride,
    db
  );
  console.info(`[OCR] detection: ${Date.now() - tDetect}ms`);

  let documentTypeId = detection.detectedType?.id;
  let canonicalKey = detection.canonicalKey;
  let displayName = detection.displayName;

  if (!documentTypeId) {
    if (canonicalKey !== "UNKNOWN") {
      const existingType = await db.documentType.findUnique({
        where: { canonicalKey },
      });
      if (existingType) {
        documentTypeId = existingType.id;
        displayName = existingType.displayName;
      }
    }

    if (!documentTypeId) {
      documentTypeId = await getOrCreateUnknownDocumentType(db);
    }
  }

  // ── 8. Duplicate check (only for identified types) ─────────────────────
  if (canonicalKey !== "UNKNOWN") {
    const existingDoc = await db.document.findFirst({
      where: { userId: trimmedUserId, documentTypeId },
      orderBy: { createdAt: "desc" },
    });

    if (existingDoc && !options.duplicateResolution) {
      return {
        success: false,
        duplicateDetected: true,
        existingDocument: {
          id: existingDoc.id,
          displayName: existingDoc.displayName,
          documentTypeKey: canonicalKey,
          createdAt: existingDoc.createdAt.toISOString(),
        },
      };
    }

    if (existingDoc && options.duplicateResolution === "replace_existing") {
      await db.document.delete({ where: { id: existingDoc.id } });
    }
  }

  // ── 9. Extract fields strictly from OCR evidence ───────────────────────
  const tExtract = Date.now();
  const extraction = extractFieldsForDocument({
    canonicalKey,
    displayName,
    fileName,
    rawText: ocrResult.text,
    metadataHints: options.metadataHints,
  });
  console.info(`[OCR] extraction: ${Date.now() - tExtract}ms`);

  // Combine all warnings
  const combinedWarnings = Array.from(
    new Set([
      ...quality.warnings,
      ...ocrResult.warnings,
      ...detection.warnings,
      ...extraction.warnings,
    ])
  );

  // Adjust extraction status
  let extractionStatus = extraction.status;
  let extractionConfidence = extraction.confidence;

  if (canonicalKey === "UNKNOWN" || shouldSkipOCR) {
    extractionStatus = "NEEDS_REVIEW";
    extractionConfidence = 0.0;
  } else if (!quality.isValid) {
    extractionStatus = "NEEDS_REVIEW";
    extractionConfidence = Math.min(extractionConfidence, 0.4);
  }

  // Check for OCR timeout signal
  const ocrTimedOut = ocrResult.warnings.some((w) => w.startsWith("OCR_TIMEOUT"));
  if (ocrTimedOut) {
    extractionStatus = "NEEDS_REVIEW";
    extractionConfidence = 0.0;
  }

  // ── 10. Persist document record ────────────────────────────────────────
  const tDb = Date.now();
  const createdDoc = await db.document.create({
    data: {
      userId: trimmedUserId,
      documentTypeId,
      displayName,
      source: "UPLOADED",
      issuer: extraction.issuer,
      issueDate: extraction.issueDate ? new Date(extraction.issueDate) : null,
      expiryDate: extraction.expiryDate ? new Date(extraction.expiryDate) : null,
      imageStorageKey: fileKey,
      mimeType: validation.mimeType,
      fileSize: validation.fileSize,
      extractionStatus: extractionStatus,
      extractionConfidence: extractionConfidence,
      extractedMetadataJson: JSON.stringify(extraction.fields),
      extractionWarningsJson: JSON.stringify(combinedWarnings),
    },
  });

  // ── 11. Batch-create DocumentField records ─────────────────────────────
  if (extraction.fields.length > 0) {
    await db.documentField.createMany({
      data: extraction.fields.map((field) => ({
        documentId: createdDoc.id,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        semanticRole: field.semanticRole,
        normalizedValue: field.normalizedValue,
        rawExtractedValue: field.value,
        isUserCorrected: false,
      })),
    });
  }

  // ── 12. Batch-create IdentityEvidence for confirmed high-confidence fields
  // Only genuine FOUND fields with confidence >= 0.5 produce identity evidence.
  // This never runs for UNKNOWN/NEEDS_REVIEW documents.
  if (canonicalKey !== "UNKNOWN" && !shouldSkipOCR && !ocrTimedOut) {
    const confirmedFields = extraction.fields.filter(
      (field) =>
        field.semanticRole &&
        field.status === "FOUND" &&
        field.value.trim().length > 0 &&
        field.confidence >= 0.5
    );

    if (confirmedFields.length > 0) {
      // We need document field IDs to create identity evidence with proper FK.
      // Fetch the just-created fields in one query.
      const createdFields = await db.documentField.findMany({
        where: { documentId: createdDoc.id },
        select: { id: true, fieldName: true, semanticRole: true, normalizedValue: true },
      });

      const evidenceData = confirmedFields.flatMap((field) => {
        const dbField = createdFields.find((f) => f.fieldName === field.fieldName);
        if (!dbField || !dbField.semanticRole) return [];
        return [{
          userId: trimmedUserId,
          documentId: createdDoc.id,
          fieldId: dbField.id,
          semanticRole: dbField.semanticRole,
          normalizedValue: dbField.normalizedValue,
        }];
      });

      if (evidenceData.length > 0) {
        await db.identityEvidence.createMany({ data: evidenceData });
      }
    }
  }

  console.info(`[OCR] database: ${Date.now() - tDb}ms`);

  // ── 13. Verification, Consistency, Journey updates ─────────────────────
  const tPostProcess = Date.now();
  const verification = await verifyDocument(trimmedUserId, createdDoc.id, db);
  const consistency = await getVaultConsistencyAssessment(trimmedUserId, db);
  const journey = await getApplicationJourney(trimmedUserId, "KCET", db);
  console.info(`[OCR] post-process: ${Date.now() - tPostProcess}ms`);

  console.info(`[OCR] total: ${Date.now() - t0}ms`);

  return {
    success: true,
    document: {
      id: createdDoc.id,
      userId: createdDoc.userId,
      documentTypeId: createdDoc.documentTypeId,
      documentTypeKey: canonicalKey,
      displayName: createdDoc.displayName,
      source: createdDoc.source,
      issuer: createdDoc.issuer,
      issueDate: createdDoc.issueDate ? createdDoc.issueDate.toISOString() : null,
      expiryDate: createdDoc.expiryDate ? createdDoc.expiryDate.toISOString() : null,
      imageStorageKey: createdDoc.imageStorageKey,
      mimeType: createdDoc.mimeType,
      fileSize: createdDoc.fileSize,
      extractionStatus: extractionStatus as any,
      extractionConfidence: extractionConfidence,
      fields: extraction.fields,
    },
    extraction: {
      ...extraction,
      status: extractionStatus,
      confidence: extractionConfidence,
      warnings: combinedWarnings,
      ocrTimedOut,
    } as any,
    verification,
    consistency,
    journey,
  };
}

/**
 * Updates document metadata fields corrected by the citizen.
 * Original uploaded image remains strictly untouched.
 */
export async function updateDocumentMetadata(
  userId: string,
  documentId: string,
  corrections: UserFieldCorrection[],
  db: PrismaClient = prisma
): Promise<{ success: boolean; documentId: string; updatedFields: number }> {
  const trimmedUserId = userId?.trim();
  const trimmedDocId = documentId?.trim();

  const doc = await db.document.findFirst({
    where: { id: trimmedDocId, userId: trimmedUserId },
    include: { fields: true },
  });

  if (!doc) {
    throw new Error("Document not found or access denied.");
  }

  let updatedCount = 0;

  for (const correction of corrections) {
    const field = doc.fields.find(
      (f) =>
        f.id === correction.fieldId ||
        f.fieldName.toLowerCase() === correction.fieldName.toLowerCase()
    );

    if (field) {
      let normalizedValue = correction.correctedValue.trim();
      if (field.semanticRole === "CANDIDATE_NAME") {
        normalizedValue = normalizeName(correction.correctedValue);
      } else if (field.semanticRole === "DATE_OF_BIRTH") {
        normalizedValue = normalizeDob(correction.correctedValue);
      } else if (field.semanticRole === "GENDER") {
        normalizedValue = normalizeGender(correction.correctedValue);
      } else if (field.semanticRole === "PARENT_NAME") {
        normalizedValue = normalizeParentName(correction.correctedValue);
      }

      await db.documentField.update({
        where: { id: field.id },
        data: {
          rawExtractedValue: correction.correctedValue,
          normalizedValue,
          isUserCorrected: true,
        },
      });

      if (field.semanticRole) {
        await db.identityEvidence.deleteMany({ where: { fieldId: field.id } });

        if (normalizedValue.length > 0) {
          await db.identityEvidence.create({
            data: {
              userId: trimmedUserId,
              documentId: doc.id,
              fieldId: field.id,
              semanticRole: field.semanticRole,
              normalizedValue,
            },
          });
        }
      }

      updatedCount++;
    }
  }

  return { success: true, documentId: trimmedDocId, updatedFields: updatedCount };
}

/**
 * Retrieves the original uploaded document image buffer for authenticated streaming.
 * Returns null if document does not exist, user does not own it, or no image is stored.
 * Never re-runs OCR — the stored image is streamed directly.
 */
export async function getDocumentImageStream(
  userId: string,
  documentId: string,
  db: PrismaClient = prisma
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  const trimmedUserId = userId?.trim();
  const trimmedDocId = documentId?.trim();

  if (!trimmedUserId || !trimmedDocId) return null;

  const doc = await db.document.findFirst({
    where: { id: trimmedDocId, userId: trimmedUserId },
  });

  if (!doc || !doc.imageStorageKey) return null;

  const filePath = path.join(UPLOADS_DIR, doc.imageStorageKey);

  try {
    const buffer = await fs.readFile(filePath);
    return {
      buffer,
      mimeType: doc.mimeType || "image/jpeg",
      fileName: doc.imageStorageKey,
    };
  } catch {
    return null;
  }
}
