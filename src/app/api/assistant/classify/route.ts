import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/server/assistant/classifier";
import { AssistantIntent, IntentTypes } from "@/server/assistant/types";
import { getServiceReadiness } from "@/server/services/readiness";
import { getDocumentGuidance } from "@/server/guidance/registry";
import { verifyDocumentByType } from "@/server/verification/verifier";
import { getSharePreview } from "@/server/sharing/service";
import { getApplicationJourney } from "@/server/journey/service";
import { getVaultConsistencyAssessment } from "@/server/consistency";
import { getDemoUser, getUserDocuments } from "@/server/vault";
import type { ServiceReadiness } from "@/server/services/types";
import type { DocumentGuidance } from "@/server/guidance/types";
import type { DocumentVerification } from "@/server/verification/types";
import type { SharePreviewDTO } from "@/server/sharing/types";
import type { ApplicationJourney } from "@/server/journey/types";
import type { ConsistencyAssessment } from "@/server/consistency/types";
import { resolveDocumentType } from "@/server/ontology";

async function generateAssistantResponse(
  intent: AssistantIntent,
  explicitUserId?: string
): Promise<{
  response: string;
  suggestions?: string[];
  readiness?: ServiceReadiness | null;
  guidance?: DocumentGuidance | null;
  verification?: DocumentVerification | null;
  sharePreview?: SharePreviewDTO | null;
  journey?: ApplicationJourney | null;
  consistency?: ConsistencyAssessment | null;
}> {
  const rawMsg = (intent.originalMessage || "").toLowerCase();
  const demoUser = explicitUserId ? { id: explicitUserId } : await getDemoUser();

  // Handle explicit consistency / conflict inquiries
  if (
    rawMsg.includes("conflict") ||
    rawMsg.includes("mismatch") ||
    rawMsg.includes("consistency") ||
    rawMsg.includes("different") ||
    rawMsg.includes("differ") ||
    rawMsg.includes("why is my application not ready") ||
    rawMsg.includes("why am i not ready") ||
    rawMsg.includes("not verified")
  ) {
    try {
      const consistency = await getVaultConsistencyAssessment(demoUser.id);
      const journey = await getApplicationJourney(demoUser.id, "KCET");

      if (consistency.hasConflicts) {
        const conflict = consistency.conflicts[0];
        const affected = conflict?.entries.map((e) => `${e.documentDisplayName} ("${e.rawValue}")`).join(" and ") || "your documents";

        return {
          response: `I found an identity conflict in your documents (${conflict?.fieldLabel || "Details"} differs between ${affected}).\n\nDigiReady cannot change the information on either official document. The next step is to determine which record needs correction and follow the issuing authority's official correction process.\n\nReview the official correction steps below:`,
          consistency,
          journey: journey ?? null,
          suggestions: [
            "I want to apply for KCET",
            "What documents am I missing?",
            "Can you check my 12th marks card?",
          ],
        };
      } else {
        return {
          response: `Great news! I checked your vault documents across Name, Date of Birth, Parent Name, Gender, and Address. **No cross-document identity conflicts were detected.**`,
          consistency,
          journey: journey ?? null,
          suggestions: [
            "I want to apply for KCET",
            "What documents am I missing?",
            "Check my documents",
          ],
        };
      }
    } catch {
      // Fall through
    }
  }

  switch (intent.intent) {
    case IntentTypes.APPLY_FOR_SERVICE: {
      if (!intent.service) {
        return {
          response: "Sure! Which examination or public service are you preparing for?",
          suggestions: [
            "I want to apply for KCET",
            "I need to apply for a scholarship",
            "I want to apply for a passport",
            "What documents do I need for EPFO?",
          ],
        };
      }

      try {
        const readiness = await getServiceReadiness(demoUser.id, intent.service);
        const journey = await getApplicationJourney(demoUser.id, intent.service);

        if (!readiness) {
          return {
            response: `I can help you check document readiness, but I don't have requirements configured for **${intent.service}** yet. You can try asking about KCET, Government Scholarship, Passport, or EPFO.`,
            suggestions: [
              "I want to apply for KCET",
              "What do I need for a scholarship?",
              "Passport application requirements",
            ],
          };
        }

        const missingDocs = readiness.documents.filter((d) => d.required && d.status === "MISSING");
        const missingNames = missingDocs.map((d) => d.displayName).join(", ");

        let responseText = "";
        if (readiness.ready) {
          responseText = `You're ready for **${readiness.serviceName}**! You have all **${readiness.requiredCount} of ${readiness.requiredCount} required documents** in your DigiReady vault with no missing requirements.`;
        } else {
          responseText = `You're preparing for **${readiness.serviceName}**. You currently have **${readiness.availableCount} of ${readiness.requiredCount} required documents** in your DigiReady vault. Missing: **${missingNames}**.`;
        }

        const suggestions = [
          "Check my documents",
          missingDocs.length > 0
            ? `How do I get an ${missingDocs[0].displayName.toLowerCase()}?`
            : "Do my documents have any conflicts?",
          "Do my documents have any conflicts?",
        ];

        return {
          response: responseText,
          readiness,
          journey: journey ?? null,
          suggestions,
        };
      } catch (err) {
        return {
          response: `I understand that you want to apply for **${intent.service}**. I can help you verify your required documents.`,
          suggestions: ["Check my documents", "Open My Documents"],
        };
      }
    }

    case IntentTypes.VERIFY_DOCUMENT: {
      const docName = intent.document;
      if (!docName || docName === "document" || docName === "certificate") {
        return {
          response: "Which document would you like me to check in your vault? (e.g., 12th marks card, 10th marks card, Aadhaar, study certificate)",
          suggestions: [
            "Can you check my 12th marks card?",
            "Verify my 10th marks card",
            "Verify my Aadhaar",
            "Verify my study certificate",
          ],
        };
      }

      try {
        const verifyResult = await verifyDocumentByType(demoUser.id, docName);

        if (!verifyResult || !verifyResult.verification) {
          return {
            response: `I couldn't find a **${docName}** in your vault to verify.`,
            suggestions: [
              `How do I get an ${docName}?`,
              "Open My Documents",
              "Check KCET application readiness",
            ],
          };
        }

        const verification = verifyResult.verification;
        const isLegalQuery = intent.originalMessage?.toLowerCase().includes("legal") || intent.originalMessage?.toLowerCase().includes("valid");

        let summaryText = "";
        if (isLegalQuery) {
          summaryText = `I evaluated your **${verification.displayName}** within the DigiReady prototype. This assessment checks metadata completeness for application preparation and does not confirm official legal validity or statutory government authenticity.`;
        } else if (verification.status === "READY_FOR_REVIEW") {
          summaryText = `I performed a metadata completeness check on your **${verification.displayName}**. All required metadata attributes (${verification.checks.length}/${verification.checks.length}) are present in the prototype vault.`;
        } else if (verification.status === "NEEDS_REVIEW") {
          summaryText = `I checked your **${verification.displayName}**. It requires review because some expected metadata attributes are missing or incomplete (${verification.checks.filter((c) => c.status !== "PASS").length} issue(s) detected).`;
        } else {
          summaryText = `Your **${verification.displayName}** is available in your vault.`;
        }

        return {
          response: summaryText,
          verification,
          suggestions: [
            "I want to apply for KCET",
            "Do my documents have any conflicts?",
            "Check my documents",
          ],
        };
      } catch (err) {
        return {
          response: `I can help verify metadata for **${docName}**.`,
          suggestions: ["Check my documents", "Open My Documents"],
        };
      }
    }

    case IntentTypes.MISSING_DOCUMENT: {
      const docName = intent.document;
      if (!docName) {
        return {
          response: "Which document are you missing or looking to obtain? I can provide structured next steps and guidance.",
          suggestions: [
            "How do I get an income certificate?",
            "My caste certificate is missing",
            "How do I get a study certificate?",
          ],
        };
      }

      const guidance = getDocumentGuidance(docName);
      if (!guidance) {
        return {
          response: `I don't have specific guidance configured for **${docName}** yet. Please check the applicable official or local authority for the current application process.`,
          suggestions: [
            "How do I get an income certificate?",
            "How do I get a caste certificate?",
            "What documents do I have in my vault?",
          ],
        };
      }

      return {
        response: `Here is guidance on obtaining an **${guidance.displayName}**:\n\n${guidance.description}\n\n**Next Steps:**\n${guidance.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
        guidance,
        suggestions: [
          "What documents do I have in my vault?",
          "I want to apply for KCET",
          "Do my documents have any conflicts?",
        ],
      };
    }

    case IntentTypes.CHECK_DOCUMENT: {
      const docName = intent.document || "this document";
      return {
        response: `I can check your digital vault to confirm whether **${docName}** is available and properly verified.`,
        suggestions: [
          `Can you check my ${docName}?`,
          "Check all my documents",
          "Do my documents have any conflicts?",
        ],
      };
    }

    case IntentTypes.FIND_DOCUMENT: {
      const docName = intent.document || "your document";
      return {
        response: `I can help you locate **${docName}** in your vault. You can also use the search filter in My Documents to view it immediately.`,
        suggestions: [
          "Open My Documents",
          "Filter by Issued documents",
          "Search all certificates",
        ],
      };
    }

    case IntentTypes.SHARE_DOCUMENT: {
      const docName = intent.document;
      if (!docName || docName === "document" || docName === "certificate") {
        return {
          response: "Which document would you like to securely share? (e.g., 12th marks card, 10th marks card, Aadhaar, study certificate)",
          suggestions: [
            "Share my 12th marks card",
            "Share my Aadhaar",
            "Share my 10th marks card",
          ],
        };
      }

      try {
        const userDocs = await getUserDocuments(demoUser.id);
        const normDocQuery = docName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        const resolvedType = await resolveDocumentType(docName);

        const matchedDoc = userDocs.find((d) => {
          if (resolvedType && d.documentTypeId === resolvedType.id) {
            return true;
          }
          const normKey = d.documentTypeKey.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          const normName = d.displayName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          const normTypeName = d.documentTypeName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

          return (
            normKey === normDocQuery ||
            normName === normDocQuery ||
            normTypeName === normDocQuery ||
            normName.includes(normDocQuery) ||
            normDocQuery.includes(normName)
          );
        });

        if (!matchedDoc) {
          return {
            response: `I couldn't find that document in your DigiReady vault.`,
            suggestions: [
              `How do I get an ${docName}?`,
              "Open My Documents",
              "Check KCET readiness",
            ],
          };
        }

        const recipient = intent.recipient;
        const purpose = intent.purpose;

        if (!recipient) {
          return {
            response: `Who would you like to share your **${matchedDoc.displayName}** with? (e.g., Admissions Office, Scholarship Authority, Employer)`,
            suggestions: [
              `Share ${matchedDoc.displayName} with Admissions Office`,
              `Share ${matchedDoc.displayName} with Scholarship Authority`,
            ],
          };
        }

        if (!purpose) {
          return {
            response: `What is the purpose of sharing your **${matchedDoc.displayName}** with **${recipient}**? (e.g., KCET admission verification, scholarship eligibility check)`,
            suggestions: [
              `Share ${matchedDoc.displayName} with ${recipient} for KCET admission verification`,
              `Share ${matchedDoc.displayName} with ${recipient} for scholarship review`,
            ],
          };
        }

        const preview = await getSharePreview(demoUser.id, matchedDoc.id, recipient, purpose);
        if (!preview) {
          return {
            response: `I couldn't prepare a share preview for **${matchedDoc.displayName}**.`,
            suggestions: ["Open My Documents", "Check all my documents"],
          };
        }

        return {
          response: `I've prepared a secure sharing preview for your **${matchedDoc.displayName}** with **${recipient}** for **${purpose}**.\n\nPlease review the scoped attributes below and grant explicit consent to create the share. (Note: Sharing is optional and not required for application readiness).`,
          sharePreview: preview,
          suggestions: [
            "I want to apply for KCET",
            "Do my documents have any conflicts?",
            "Check my documents",
          ],
        };
      } catch {
        return {
          response: `I can help with document readiness and verification.`,
          suggestions: ["I want to apply for KCET", "Check my documents"],
        };
      }
    }

    case IntentTypes.GENERAL_HELP:
    default: {
      return {
        response:
          "I'm your **DigiReady Assistant**. I help you prepare for examinations and public applications by checking required documents, verifying metadata, and detecting cross-document identity conflicts before you apply.\n\nTry asking one of the options below:",
        suggestions: [
          "I want to apply for KCET",
          "Check my documents",
          "Do my documents have any conflicts?",
          "How do I get an income certificate?",
          "Can you check my 12th marks card?",
        ],
      };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = body?.message;
    const userId = body?.userId;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({
        intent: {
          intent: IntentTypes.GENERAL_HELP,
          confidence: 1.0,
          originalMessage: "",
        },
        friendlyResponse:
          "Hello! I am your DigiReady Assistant. I can check your document readiness, guide you through missing documents, and detect cross-document identity conflicts.",
        suggestions: [
          "I want to apply for KCET",
          "Check my documents",
          "Do my documents have any conflicts?",
          "How do I get an income certificate?",
        ],
      });
    }

    const intent = await classifyIntent(message);
    const result = await generateAssistantResponse(intent, userId);

    return NextResponse.json({
      intent,
      friendlyResponse: result.response,
      suggestions: result.suggestions ?? [],
      readiness: result.readiness ?? null,
      guidance: result.guidance ?? null,
      verification: result.verification ?? null,
      sharePreview: result.sharePreview ?? null,
      journey: result.journey ?? null,
      consistency: result.consistency ?? null,
    });
  } catch (error) {
    console.error("Assistant classification error:", error);
    return NextResponse.json(
      {
        error: "Failed to classify assistant intent",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
