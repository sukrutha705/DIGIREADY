/**
 * DigiReady - Ephemeral Document Verification Abstraction
 * 
 * ARCHITECTURAL PRINCIPLE:
 * Sensitive document binaries, scans, PDFs, and raw OCR text are NEVER persisted to the database.
 * 
 * Ephemeral Lifecycle:
 * 1. Citizen provides temporary access/upload to a document buffer.
 * 2. Processing and metadata extraction occurs strictly in-memory during the session.
 * 3. Derived, non-sensitive metadata (e.g. IdentityEvidence) is verified.
 * 4. VerificationResult is returned to the session.
 * 5. Temporary document contents are immediately discarded from memory.
 */

export interface EphemeralDocumentInput {
  documentTypeId: string;
  temporaryBuffer?: ArrayBuffer | string;
  source: "ISSUED" | "UPLOADED";
  issuerHint?: string;
}

export interface ExtractedMetadataField {
  fieldName: string;
  semanticRole: string;
  normalizedValue: string;
}

export interface EphemeralVerificationResult {
  verified: boolean;
  documentTypeId: string;
  issuer: string;
  issueDate?: Date;
  expiryDate?: Date;
  extractedFields: ExtractedMetadataField[];
  statusMessage: string;
  contentDiscarded: boolean;
}

export interface EphemeralDocumentVerifier {
  verify(input: EphemeralDocumentInput): Promise<EphemeralVerificationResult>;
}

/**
 * Mock/Stub implementation of the Ephemeral Document Verifier for prototype demonstrations.
 * Demonstrates the strict privacy contract without processing real files.
 */
export class MockEphemeralDocumentVerifier implements EphemeralDocumentVerifier {
  async verify(input: EphemeralDocumentInput): Promise<EphemeralVerificationResult> {
    // Demonstration stub: metadata extraction simulation without file persistence
    return {
      verified: true,
      documentTypeId: input.documentTypeId,
      issuer: input.issuerHint ?? "Demo Verification Authority",
      extractedFields: [],
      statusMessage: "Synthetic ephemeral verification completed. Temporary content discarded.",
      contentDiscarded: true,
    };
  }
}
