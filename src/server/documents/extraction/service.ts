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

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates file buffer magic bytes, size, and MIME type.
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

  // 1. Magic bytes validation
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
 * Processes a document image upload:
 * 1. Validates image bytes & format
 * 2. Saves original image to uploads directory
 * 3. Detects document type
 * 4. Checks duplicate document types
 * 5. Extracts metadata fields
 * 6. Creates Document & DocumentField records
 * 7. Runs verification & consistency checks
 * 8. Returns comprehensive readiness DTO
 */
export async function processDocumentUpload(
  fileBuffer: Buffer,
  fileName: string,
  declaredMimeType: string,
  userId: string,
  options: ProcessUploadOptions = {},
  db: PrismaClient = prisma
): Promise<ProcessUploadResult> {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    return { success: false, error: "User ID is required." };
  }

  // 1. User validation
  const user = await db.user.findUnique({ where: { id: trimmedUserId } });
  if (!user) {
    throw new UserNotFoundError(trimmedUserId);
  }

  // 2. Validate image buffer and format
  const validation = validateImageUpload(fileBuffer, fileName, declaredMimeType);
  if (!validation.valid || !validation.mimeType || !validation.detectedExtension) {
    return { success: false, error: validation.error || "Invalid image file." };
  }

  // 3. Detect Document Type
  const detection = await detectDocumentType(
    fileName,
    undefined,
    options.documentTypeOverride,
    db
  );

  let documentTypeId = detection.detectedType?.id;
  let canonicalKey = detection.canonicalKey;
  let displayName = detection.displayName;

  // Fallback: If documentType could not be matched, resolve to UNKNOWN or first available
  if (!documentTypeId) {
    const existingType = await db.documentType.findUnique({
      where: { canonicalKey },
    });
    if (existingType) {
      documentTypeId = existingType.id;
      displayName = existingType.displayName;
    } else {
      const anyType = await db.documentType.findFirst();
      if (anyType) {
        documentTypeId = anyType.id;
      }
    }
  }

  if (!documentTypeId) {
    return { success: false, error: "Could not map to a recognized document type." };
  }

  // 4. Check for duplicate documents of same type
  const existingDoc = await db.document.findFirst({
    where: {
      userId: trimmedUserId,
      documentTypeId,
    },
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

  // Handle replace existing if requested
  if (existingDoc && options.duplicateResolution === "replace_existing") {
    // Delete previous document and associated fields/evidence
    await db.document.delete({ where: { id: existingDoc.id } });
  }

  // 5. Store original image safely
  await ensureUploadsDir();
  const fileKey = `upload_${crypto.randomUUID()}.${validation.detectedExtension}`;
  const filePath = path.join(UPLOADS_DIR, fileKey);
  await fs.writeFile(filePath, fileBuffer);

  // 6. Extract fields
  const extraction = extractFieldsForDocument({
    canonicalKey,
    displayName,
    fileName,
  });

  // 7. Create Document record
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
      extractionStatus: extraction.status,
      extractionConfidence: extraction.confidence,
      extractedMetadataJson: JSON.stringify(extraction.fields),
      extractionWarningsJson: JSON.stringify(extraction.warnings),
    },
  });

  // 8. Create DocumentField records & Identity Evidence
  for (const field of extraction.fields) {
    const createdField = await db.documentField.create({
      data: {
        documentId: createdDoc.id,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        semanticRole: field.semanticRole,
        normalizedValue: field.normalizedValue,
        rawExtractedValue: field.value,
        isUserCorrected: false,
      },
    });

    if (field.semanticRole) {
      await db.identityEvidence.create({
        data: {
          userId: trimmedUserId,
          documentId: createdDoc.id,
          fieldId: createdField.id,
          semanticRole: field.semanticRole,
          normalizedValue: field.normalizedValue,
        },
      });
    }
  }

  // 9. Run Verification, Consistency, and Application Journey updates
  const verification = await verifyDocument(trimmedUserId, createdDoc.id, db);
  const consistency = await getVaultConsistencyAssessment(trimmedUserId, db);
  const journey = await getApplicationJourney(trimmedUserId, "KCET", db);

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
      extractionStatus: createdDoc.extractionStatus as any,
      extractionConfidence: createdDoc.extractionConfidence || 1.0,
      fields: extraction.fields,
    },
    extraction,
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
      let normalized = correction.correctedValue.trim();
      if (field.semanticRole === "CANDIDATE_NAME") {
        normalized = normalizeName(correction.correctedValue);
      } else if (field.semanticRole === "DATE_OF_BIRTH") {
        normalized = normalizeDob(correction.correctedValue);
      } else if (field.semanticRole === "PARENT_NAME") {
        normalized = normalizeParentName(correction.correctedValue);
      } else if (field.semanticRole === "GENDER") {
        normalized = normalizeGender(correction.correctedValue);
      }

      await db.documentField.update({
        where: { id: field.id },
        data: {
          normalizedValue: normalized,
          isUserCorrected: true,
          rawExtractedValue: field.rawExtractedValue || field.normalizedValue,
        },
      });

      // Update associated identity evidence
      await db.identityEvidence.updateMany({
        where: { fieldId: field.id },
        data: { normalizedValue: normalized },
      });

      updatedCount++;
    }
  }

  return {
    success: true,
    documentId: doc.id,
    updatedFields: updatedCount,
  };
}

/**
 * Retrieves the raw image buffer from private storage verifying user ownership.
 */
export async function getDocumentImageStream(
  userId: string,
  documentId: string,
  db: PrismaClient = prisma
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  const trimmedUserId = userId?.trim();
  const trimmedDocId = documentId?.trim();

  const doc = await db.document.findFirst({
    where: { id: trimmedDocId, userId: trimmedUserId },
  });

  if (!doc || !doc.imageStorageKey) {
    return null;
  }

  const safeFileName = path.basename(doc.imageStorageKey);
  const filePath = path.join(UPLOADS_DIR, safeFileName);

  try {
    const buffer = await fs.readFile(filePath);
    return {
      buffer,
      mimeType: doc.mimeType || "image/jpeg",
      fileName: safeFileName,
    };
  } catch (err) {
    console.error("Could not read image file:", err);
    return null;
  }
}
