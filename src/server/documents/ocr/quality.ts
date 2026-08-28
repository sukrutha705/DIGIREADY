import { ImageQualityResult, ImageQualityStatus } from "./types";

/**
 * Extracts basic width and height from PNG, JPEG, or WEBP binary buffers without external native dependencies.
 */
function parseImageDimensions(
  buffer: Buffer,
  mimeType: string
): { width?: number; height?: number } {
  try {
    if (mimeType === "image/png" && buffer.length >= 24) {
      // PNG IHDR is at offset 16 (4 bytes width, 4 bytes height, big-endian)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    if (mimeType === "image/jpeg" && buffer.length >= 4) {
      // Walk JPEG markers to find SOF0 (0xFF, 0xC0) or SOF2 (0xFF, 0xC2)
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0, SOF1, SOF2 markers
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Move to next segment
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    if (mimeType === "image/webp" && buffer.length >= 30) {
      // Lossy VP8
      if (buffer.toString("ascii", 12, 16) === "VP8 ") {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      // Lossless VP8L
      if (buffer.toString("ascii", 12, 16) === "VP8L") {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
    }
  } catch {
    // Return undefined dimensions gracefully
  }

  return {};
}

/**
 * Deterministically checks image quality, resolution, readability, and content suitability.
 */
export function inspectImageQuality(
  buffer: Buffer,
  mimeType: string
): ImageQualityResult {
  const warnings: string[] = [];
  const fileSize = buffer.length;

  if (!buffer || fileSize === 0) {
    return {
      status: "IMAGE_UNREADABLE",
      isValid: false,
      fileSize: 0,
      mimeType,
      warnings: ["Uploaded file is empty."],
      details: "Empty buffer received.",
    };
  }

  // 1. File size checks
  if (fileSize < 200) {
    warnings.push("Image file size is unusually small. The document may be corrupt or blank.");
    return {
      status: "IMAGE_LOW_QUALITY",
      isValid: false,
      fileSize,
      mimeType,
      warnings,
      details: "File size under 200 bytes.",
    };
  }

  // 2. Parse image dimensions
  const { width, height } = parseImageDimensions(buffer, mimeType);

  if (width !== undefined && height !== undefined) {
    // Resolution checks
    if (width < 60 || height < 60) {
      warnings.push(
        `Image resolution is too low (${width}x${height}px) for reliable document text recognition. Please upload a higher resolution document scan.`
      );
      return {
        status: "IMAGE_LOW_QUALITY",
        isValid: false,
        width,
        height,
        fileSize,
        mimeType,
        warnings,
        details: `Dimensions ${width}x${height}px below minimum 60x60px threshold.`,
      };
    }

    if (width < 200 || height < 200) {
      warnings.push("Image resolution is relatively low. Text extraction may be less accurate.");
    }
  }

  // 3. Simple byte-entropy / blank image check
  let nonZeroCount = 0;
  for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
    if (buffer[i] !== 0 && buffer[i] !== 0xff) {
      nonZeroCount++;
    }
  }

  if (nonZeroCount < 10) {
    warnings.push("Image appears to be blank or completely uniform.");
    return {
      status: "IMAGE_NO_TEXT",
      isValid: false,
      width,
      height,
      fileSize,
      mimeType,
      warnings,
      details: "Near-zero byte entropy detected.",
    };
  }

  const status: ImageQualityStatus = warnings.length > 0 ? "IMAGE_REQUIRES_REVIEW" : "IMAGE_VALID";

  return {
    status,
    isValid: true,
    width,
    height,
    fileSize,
    mimeType,
    warnings,
  };
}
