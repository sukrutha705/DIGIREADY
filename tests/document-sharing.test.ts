import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getDemoUser, getUserDocuments } from "../src/server/vault";
import {
  getSharePreview,
  createDocumentShare,
  getDocumentShareByToken,
  getUserShares,
  revokeDocumentShare,
  generateShareToken,
  ConsentRequiredError,
  ShareValidationError,
  ShareNotFoundError,
} from "../src/server/sharing/service";
import { SHARING_POLICY, isShareExpired } from "../src/server/sharing/policy";
import { classifyIntent, extractRecipient, extractPurpose } from "../src/server/assistant/classifier";
import { IntentTypes } from "../src/server/assistant/types";
import { GET as getPreviewRoute } from "../src/app/api/documents/[id]/share/preview/route";
import { POST as createShareRoute } from "../src/app/api/documents/[id]/share/route";
import { GET as getSharesRoute } from "../src/app/api/shares/route";
import { GET as getTokenRoute } from "../src/app/api/shares/[token]/route";
import { POST as revokeShareRoute } from "../src/app/api/shares/[token]/revoke/route";
import { POST as assistantClassifyRoute } from "../src/app/api/assistant/classify/route";

describe("Phase 7.5: Secure Document Sharing & Consent Layer", () => {
  let demoUserId: string;
  let demoDocs: Array<{ id: string; displayName: string; documentTypeKey: string }>;

  beforeAll(async () => {
    const user = await getDemoUser(prisma);
    expect(user).toBeDefined();
    demoUserId = user.id;

    demoDocs = await getUserDocuments(demoUserId, undefined, prisma);
    expect(demoDocs.length).toBeGreaterThanOrEqual(6);
  });

  describe("1. Sharing Policy & Token Generation", () => {
    it("generates unpredictable share tokens with the configured prefix", () => {
      const token1 = generateShareToken();
      const token2 = generateShareToken();

      expect(token1.startsWith(SHARING_POLICY.tokenPrefix)).toBe(true);
      expect(token2.startsWith(SHARING_POLICY.tokenPrefix)).toBe(true);
      expect(token1).not.toBe(token2);
      
      const hexPart = token1.slice(SHARING_POLICY.tokenPrefix.length);
      expect(hexPart.length).toBe(40);
      expect(/^[0-9a-f]{40}$/i.test(hexPart)).toBe(true);
      expect(token1.length).toBe(SHARING_POLICY.tokenPrefix.length + 40);
    });

    it("evaluates default view-only permissions without download capability", () => {
      expect(SHARING_POLICY.defaultPermissions.canView).toBe(true);
      expect(SHARING_POLICY.defaultPermissions.canDownload).toBe(false);
    });

    it("evaluates share expiration accurately", () => {
      const pastDate = new Date(Date.now() - 1000 * 60);
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);

      expect(isShareExpired(pastDate)).toBe(true);
      expect(isShareExpired(futureDate)).toBe(false);
    });
  });

  describe("2. Share Preview & Attribute Scoping", () => {
    it("generates a complete share preview for a valid user document", async () => {
      const doc = demoDocs[0];
      const preview = await getSharePreview(
        demoUserId,
        doc.id,
        "Admissions Office",
        "KCET admission verification",
        prisma
      );

      expect(preview).not.toBeNull();
      expect(preview?.documentId).toBe(doc.id);
      expect(preview?.documentDisplayName).toBe(doc.displayName);
      expect(preview?.suggestedRecipient).toBe("Admissions Office");
      expect(preview?.suggestedPurpose).toBe("KCET admission verification");
      expect(preview?.availableFields.length).toBeGreaterThanOrEqual(1);
      expect(preview?.defaultFieldIds.length).toBe(preview?.availableFields.length);
      expect(preview?.permissions.canView).toBe(true);
      expect(preview?.permissions.canDownload).toBe(false);
      expect(preview?.consentNotice).toContain("controlled sharing permission");
    });

    it("returns null when generating preview for non-existent document ID", async () => {
      const preview = await getSharePreview(demoUserId, "non-existent-uuid-1234", undefined, undefined, prisma);
      expect(preview).toBeNull();
    });

    it("returns null when attempting to preview another user's document", async () => {
      const otherUserId = "00000000-0000-0000-0000-000000000099";
      const preview = await getSharePreview(otherUserId, demoDocs[0].id, undefined, undefined, prisma);
      expect(preview).toBeNull();
    });
  });

  describe("3. Explicit Consent & Share Creation", () => {
    it("creates an active share record with secure token upon affirmative consent", async () => {
      const doc = demoDocs[0];
      const fullDoc = await prisma.document.findUnique({
        where: { id: doc.id },
        include: { fields: true },
      });
      if (!fullDoc) throw new Error("Document not found");

      // Scope to only the first field
      const selectedFieldIds = [fullDoc.fields[0].id];

      const shareRecord = await createDocumentShare(
        demoUserId,
        {
          documentId: doc.id,
          recipientName: "Admissions Office",
          purpose: "KCET admission verification",
          includedFieldIds: selectedFieldIds,
          consent: true,
        },
        prisma
      );

      expect(shareRecord.id).toBeDefined();
      expect(shareRecord.shareToken.startsWith("dr_share_")).toBe(true);
      expect(shareRecord.status).toBe("ACTIVE");
      expect(shareRecord.recipientName).toBe("Admissions Office");
      expect(shareRecord.purpose).toBe("KCET admission verification");
      expect(shareRecord.permissions.canView).toBe(true);
      expect(shareRecord.permissions.canDownload).toBe(false);
      expect(shareRecord.sharedFields.length).toBe(1);
      expect(shareRecord.sharedFields[0].id).toBe(selectedFieldIds[0]);

      // Cleanup
      await prisma.documentShare.delete({ where: { id: shareRecord.id } }).catch(() => {});
    });

    it("rejects share creation when consent is false or omitted", async () => {
      const doc = demoDocs[0];

      await expect(
        createDocumentShare(
          demoUserId,
          {
            documentId: doc.id,
            recipientName: "Admissions Office",
            purpose: "KCET admission verification",
            includedFieldIds: [],
            consent: false,
          },
          prisma
        )
      ).rejects.toThrow(ConsentRequiredError);
    });

    it("rejects share creation when recipient or purpose is missing", async () => {
      const doc = demoDocs[0];

      await expect(
        createDocumentShare(
          demoUserId,
          {
            documentId: doc.id,
            recipientName: "",
            purpose: "Verification",
            includedFieldIds: [],
            consent: true,
          },
          prisma
        )
      ).rejects.toThrow(ShareValidationError);

      await expect(
        createDocumentShare(
          demoUserId,
          {
            documentId: doc.id,
            recipientName: "Admissions Office",
            purpose: "",
            includedFieldIds: [],
            consent: true,
          },
          prisma
        )
      ).rejects.toThrow(ShareValidationError);
    });
  });

  describe("4. Ownership Isolation & Security Protections", () => {
    it("prevents User A from creating a share grant for User B's document", async () => {
      const otherUserId = "00000000-0000-0000-0000-000000000099";

      await expect(
        createDocumentShare(
          otherUserId,
          {
            documentId: demoDocs[0].id,
            recipientName: "Admissions Office",
            purpose: "Unauthorized share attempt",
            includedFieldIds: [],
            consent: true,
          },
          prisma
        )
      ).rejects.toThrow(ShareNotFoundError);
    });

    it("prevents User A from viewing or revoking User B's share grant", async () => {
      const otherUserId = "00000000-0000-0000-0000-000000000099";

      // Create share for demoUser
      const share = await createDocumentShare(
        demoUserId,
        {
          documentId: demoDocs[0].id,
          recipientName: "State Portal",
          purpose: "Verification",
          includedFieldIds: [],
          consent: true,
        },
        prisma
      );

      // Other user queries their own shares -> should NOT see demoUser's share
      const otherUserShares = await getUserShares(otherUserId, undefined, prisma);
      expect(otherUserShares.some((s) => s.id === share.id)).toBe(false);

      // Other user attempts to revoke demoUser's share -> should throw error
      await expect(revokeDocumentShare(otherUserId, share.id, prisma)).rejects.toThrow(ShareNotFoundError);

      // Cleanup
      await prisma.documentShare.delete({ where: { id: share.id } });
    });
  });

  describe("5. Token Access & Server-Side Attribute Scoping", () => {
    it("returns ONLY explicitly selected fields when resolving an active share token", async () => {
      const doc = demoDocs[0];
      const fullDoc = await prisma.document.findUnique({
        where: { id: doc.id },
        include: { fields: true },
      });
      if (!fullDoc || fullDoc.fields.length < 2) throw new Error("Document requires fields for test");

      // Scope to ONLY field 0 (omit field 1)
      const selectedFieldId = fullDoc.fields[0].id;
      const omittedFieldId = fullDoc.fields[1].id;

      const share = await createDocumentShare(
        demoUserId,
        {
          documentId: doc.id,
          recipientName: "Review Committee",
          purpose: "Scoped Evaluation",
          includedFieldIds: [selectedFieldId],
          consent: true,
        },
        prisma
      );

      const resolved = await getDocumentShareByToken(share.shareToken, prisma);
      expect(resolved).not.toBeNull();
      expect(resolved?.status).toBe("ACTIVE");
      expect(resolved?.sharedFields.length).toBe(1);
      expect(resolved?.sharedFields[0].id).toBe(selectedFieldId);
      expect(resolved?.sharedFields.some((f) => f.id === omittedFieldId)).toBe(false);

      // Cleanup
      await prisma.documentShare.delete({ where: { id: share.id } }).catch(() => {});
    });

    it("returns null for non-existent or invalid share token", async () => {
      const resolved = await getDocumentShareByToken("dr_share_invalid_token_12345", prisma);
      expect(resolved).toBeNull();
    });
  });

  describe("6. Expiration & Revocation Lifecycle", () => {
    it("deterministically marks past-expiry shares as EXPIRED and omits field contents", async () => {
      const doc = demoDocs[0];
      const share = await createDocumentShare(
        demoUserId,
        {
          documentId: doc.id,
          recipientName: "Admissions Office",
          purpose: "Temporary verification",
          includedFieldIds: [],
          consent: true,
        },
        prisma
      );

      // Mutate expiresAt to a past timestamp
      await prisma.documentShare.update({
        where: { id: share.id },
        data: { expiresAt: new Date(Date.now() - 1000 * 60 * 60) },
      });

      const resolved = await getDocumentShareByToken(share.shareToken, prisma);
      expect(resolved?.status).toBe("EXPIRED");
      expect(resolved?.sharedFields.length).toBe(0);

      // Cleanup
      await prisma.documentShare.delete({ where: { id: share.id } }).catch(() => {});
    });

    it("revokes active share immediately and prevents further active token access", async () => {
      const doc = demoDocs[0];
      const share = await createDocumentShare(
        demoUserId,
        {
          documentId: doc.id,
          recipientName: "Scholarship Authority",
          purpose: "Eligibility review",
          includedFieldIds: [],
          consent: true,
        },
        prisma
      );

      expect(share.status).toBe("ACTIVE");

      // Revoke share
      const revoked = await revokeDocumentShare(demoUserId, share.id, prisma);
      expect(revoked.status).toBe("REVOKED");
      expect(revoked.revokedAt).not.toBeNull();

      // Query via token
      const resolved = await getDocumentShareByToken(share.shareToken, prisma);
      expect(resolved?.status).toBe("REVOKED");
      expect(resolved?.sharedFields.length).toBe(0);

      // Cleanup
      await prisma.documentShare.delete({ where: { id: share.id } }).catch(() => {});
    });
  });

  describe("7. REST API Endpoints", () => {
    it("GET /api/documents/[id]/share/preview returns preview DTO", async () => {
      const doc = demoDocs[0];
      const req = new NextRequest(
        `http://localhost:3000/api/documents/${doc.id}/share/preview?userId=${demoUserId}&recipient=Admissions+Office&purpose=KCET+verification`
      );
      const res = await getPreviewRoute(req, { params: Promise.resolve({ id: doc.id }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.documentId).toBe(doc.id);
      expect(data.suggestedRecipient).toBe("Admissions Office");
      expect(data.suggestedPurpose).toBe("KCET verification");
      expect(data.consentNotice).toBeDefined();
    });

    it("POST /api/documents/[id]/share creates share with consent (201) and rejects missing consent (400)", async () => {
      const doc = demoDocs[0];

      // Missing consent -> 400
      const badReq = new NextRequest(`http://localhost:3000/api/documents/${doc.id}/share?userId=${demoUserId}`, {
        method: "POST",
        body: JSON.stringify({
          recipientName: "Admissions Office",
          purpose: "Test",
          consent: false,
        }),
      });
      const badRes = await createShareRoute(badReq, { params: Promise.resolve({ id: doc.id }) });
      expect(badRes.status).toBe(400);

      // Affirmative consent -> 201
      const goodReq = new NextRequest(`http://localhost:3000/api/documents/${doc.id}/share?userId=${demoUserId}`, {
        method: "POST",
        body: JSON.stringify({
          recipientName: "Admissions Office",
          purpose: "KCET admission verification",
          includedFieldIds: [],
          consent: true,
        }),
      });
      const goodRes = await createShareRoute(goodReq, { params: Promise.resolve({ id: doc.id }) });
      expect(goodRes.status).toBe(201);
      const shareData = await goodRes.json();
      expect(shareData.status).toBe("ACTIVE");
      expect(shareData.shareToken.startsWith("dr_share_")).toBe(true);

      // GET /api/shares/[token]
      const tokenReq = new NextRequest(`http://localhost:3000/api/shares/${shareData.shareToken}`);
      const tokenRes = await getTokenRoute(tokenReq, { params: Promise.resolve({ token: shareData.shareToken }) });
      expect(tokenRes.status).toBe(200);
      const tokenData = await tokenRes.json();
      expect(tokenData.id).toBe(shareData.id);

      // GET /api/shares
      const listReq = new NextRequest(`http://localhost:3000/api/shares?userId=${demoUserId}`);
      const listRes = await getSharesRoute(listReq);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.shares.some((s: any) => s.id === shareData.id)).toBe(true);

      // POST /api/shares/[id]/revoke
      const revokeReq = new NextRequest(`http://localhost:3000/api/shares/${shareData.id}/revoke?userId=${demoUserId}`, {
        method: "POST",
      });
      const revokeRes = await revokeShareRoute(revokeReq, { params: Promise.resolve({ id: shareData.id }) });
      expect(revokeRes.status).toBe(200);
      const revokeData = await revokeRes.json();
      expect(revokeData.status).toBe("REVOKED");

      // Cleanup
      await prisma.documentShare.delete({ where: { id: shareData.id } }).catch(() => {});
    });
  });

  describe("8. Assistant Intent & Classification Integration", () => {
    it("extracts recipient and purpose entities from natural language messages", () => {
      const recipient = extractRecipient("Share my marks card with the admissions office for KCET admission verification");
      expect(recipient).toBe("Admissions Office");

      const purpose = extractPurpose("Share my marks card with the admissions office for KCET admission verification");
      expect(purpose).toBe("KCET admission verification");
    });

    it("classifies 'Can I share my 12th marks card?' as SHARE_DOCUMENT", () => {
      const intent = classifyIntent("Can I share my 12th marks card?");
      expect(intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(intent.document).toBe("12th marks card");
    });

    it("classifies 'Share my marks card with the admissions office' with recipient", () => {
      const intent = classifyIntent("Share my marks card with the admissions office");
      expect(intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(intent.document).toBe("marks card");
      expect(intent.recipient).toBe("Admissions Office");
      expect(intent.purpose).toBeUndefined();
    });

    it("classifies 'Share my marks card with the admissions office for KCET admission verification' with recipient and purpose", () => {
      const intent = classifyIntent(
        "Share my marks card with the admissions office for KCET admission verification"
      );
      expect(intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(intent.document).toBe("marks card");
      expect(intent.recipient).toBe("Admissions Office");
      expect(intent.purpose).toBe("KCET admission verification");
    });

    it("classifies 'How do I share a document?' as SHARE_DOCUMENT without specific document", () => {
      const intent = classifyIntent("How do I share a document?");
      expect(intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(intent.document).toBeUndefined();
    });

    it("preserves CHECK_DOCUMENT for 'Do I have my income certificate?'", () => {
      const intent = classifyIntent("Do I have my income certificate?");
      expect(intent.intent).toBe(IntentTypes.CHECK_DOCUMENT);
    });

    it("preserves VERIFY_DOCUMENT for 'Can you verify my 12th marks card?'", () => {
      const intent = classifyIntent("Can you verify my 12th marks card?");
      expect(intent.intent).toBe(IntentTypes.VERIFY_DOCUMENT);
    });

    it("preserves MISSING_DOCUMENT for 'My caste certificate is missing'", () => {
      const intent = classifyIntent("My caste certificate is missing");
      expect(intent.intent).toBe(IntentTypes.MISSING_DOCUMENT);
    });

    it("preserves APPLY_FOR_SERVICE for 'I want to apply for KCET'", () => {
      const intent = classifyIntent("I want to apply for KCET");
      expect(intent.intent).toBe(IntentTypes.APPLY_FOR_SERVICE);
    });
  });

  describe("9. Assistant End-to-End API Integration", () => {
    it("asks for recipient when document is mentioned without recipient", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "Can I share my 12th marks card?" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(data.friendlyResponse).toContain("Who would you like to share");
      expect(data.sharePreview).toBeNull();
    });

    it("asks for purpose when document and recipient are mentioned without purpose", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "Share my 12th marks card with the admissions office" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(data.friendlyResponse).toContain("purpose of sharing");
      expect(data.sharePreview).toBeNull();
    });

    it("returns structured sharePreview requiring consent when document, recipient, and purpose are provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({
          message: "Share my 12th marks card with the admissions office for KCET admission verification",
        }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(data.sharePreview).toBeDefined();
      expect(data.sharePreview.suggestedRecipient).toBe("Admissions Office");
      expect(data.sharePreview.suggestedPurpose).toBe("KCET admission verification");
      expect(data.friendlyResponse).toContain("explicit consent");
    });

    it("prompts for document clarification when generic share query is received", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "How do I share a document?" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(data.friendlyResponse).toContain("Which document would you like to securely share");
    });

    it("informs citizen when document is missing from vault", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/classify", {
        method: "POST",
        body: JSON.stringify({ message: "Can I share my income certificate?" }),
      });
      const res = await assistantClassifyRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent.intent).toBe(IntentTypes.SHARE_DOCUMENT);
      expect(data.friendlyResponse).toContain("couldn't find that document in your DigiReady vault");
      expect(data.sharePreview).toBeNull();
    });
  });
});
