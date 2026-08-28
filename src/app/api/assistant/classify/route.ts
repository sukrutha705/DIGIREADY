import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/server/assistant/classifier";
import { AssistantIntent, IntentTypes } from "@/server/assistant/types";
import { getServiceReadiness } from "@/server/services/readiness";
import { getDocumentGuidance } from "@/server/guidance/registry";
import { verifyDocumentByType } from "@/server/verification/verifier";
import { getSharePreview } from "@/server/sharing/service";
import { getApplicationJourney } from "@/server/journey/service";
import { getVaultConsistencyAssessment } from "@/server/consistency";
import { evaluateServiceEligibility } from "@/server/eligibility/service";
import { getApplicationWindowInfo } from "@/server/application-window/service";
import { getCorrectionCentres } from "@/server/centres/service";
import { GOVERNMENT_AUTHORITIES } from "@/server/authorities";
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

  // 0. Handle Location / City-based Correction Centre Queries
  const supportedCities = [
    "bengaluru",
    "bangalore",
    "delhi",
    "mumbai",
    "bombay",
    "mysuru",
    "mysore",
    "mangalore",
    "mangaluru",
    "hyderabad",
    "chennai",
    "madras",
    "pune",
    "kolkata",
    "calcutta",
    "belagavi",
    "hubballi",
  ];
  const matchedCity = supportedCities.find((c) => rawMsg.includes(c));

  if (
    matchedCity ||
    rawMsg.includes("correction centre") ||
    rawMsg.includes("correction center") ||
    rawMsg.includes("aadhaar seva kendra") ||
    rawMsg.includes("passport seva kendra") ||
    rawMsg.includes("find centre") ||
    rawMsg.includes("find center")
  ) {
    const city = matchedCity || "Bengaluru";
    let authorityId = "UIDAI";
    if (rawMsg.includes("passport")) authorityId = "PASSPORT_SEVA";
    else if (
      rawMsg.includes("income") ||
      rawMsg.includes("caste") ||
      rawMsg.includes("domicile") ||
      rawMsg.includes("nadakacheri") ||
      rawMsg.includes("revenue")
    )
      authorityId = "REVENUE_DEPARTMENT";
    else if (rawMsg.includes("pan") || rawMsg.includes("tax"))
      authorityId = "INCOME_TAX_DEPARTMENT";
    else if (
      rawMsg.includes("driving") ||
      rawMsg.includes("rto") ||
      rawMsg.includes("licence") ||
      rawMsg.includes("license")
    )
      authorityId = "TRANSPORT_DEPARTMENT";

    const centreResult = getCorrectionCentres(authorityId, city);
    if (centreResult.isVerifiedAvailable && centreResult.verifiedCentres.length > 0) {
      const list = centreResult.verifiedCentres
        .map(
          (c, i) =>
            `${i + 1}. **${c.centreName}** (✓ Officially Verified)\n   📍 ${c.address}${
              c.pincode ? " - " + c.pincode : ""
            }\n   🕒 ${c.workingHours || "Working hours: Mon-Fri"}`
        )
        .join("\n\n");
      return {
        response: `Here are the verified official correction centres for **${centreResult.authorityName}** in **${centreResult.normalizedCity}**:\n\n${list}\n\n*Official Source: ${
          centreResult.verifiedCentres[0]?.officialSource || centreResult.officialPortalName
        }*\n\n🔒 *Privacy Note: DigiReady only uses your city to find centres and does not track your exact GPS location.*`,
        suggestions: [
          "How do I fix my document conflict?",
          "Check my documents",
          "I want to apply for KCET",
        ],
      };
    } else {
      return {
        response: `Official correction centres could not be verified for **${centreResult.normalizedCity}**.\n\nFor safety, DigiReady won't guess or recommend an unverified centre. You can locate an authorized center directly on the official authority portal: [${centreResult.officialPortalName}](${centreResult.officialLocatorUrl}).`,
        suggestions: [
          "Check my documents",
          "I want to apply for KCET",
          "Find centres in Bengaluru",
        ],
      };
    }
  }

  // 0.1 Handle Specific "Where/How can I fix/correct" Inquiries
  if (
    rawMsg.includes("where can i fix") ||
    rawMsg.includes("where can i correct") ||
    rawMsg.includes("how do i fix") ||
    rawMsg.includes("how do i correct") ||
    rawMsg.includes("how to fix") ||
    rawMsg.includes("how to correct") ||
    rawMsg.includes("how to update") ||
    rawMsg.includes("where to fix")
  ) {
    let auth = GOVERNMENT_AUTHORITIES.UIDAI;
    let docType = "Aadhaar Card";
    if (rawMsg.includes("income") || rawMsg.includes("caste") || rawMsg.includes("domicile")) {
      auth = GOVERNMENT_AUTHORITIES.REVENUE_DEPARTMENT;
      docType = "Revenue / Income / Caste Certificate";
    } else if (rawMsg.includes("passport")) {
      auth = GOVERNMENT_AUTHORITIES.PASSPORT_SEVA;
      docType = "Passport";
    } else if (rawMsg.includes("pan")) {
      auth = GOVERNMENT_AUTHORITIES.INCOME_TAX_DEPARTMENT;
      docType = "PAN Card";
    } else if (
      rawMsg.includes("driving") ||
      rawMsg.includes("rto") ||
      rawMsg.includes("licence") ||
      rawMsg.includes("license")
    ) {
      auth = GOVERNMENT_AUTHORITIES.TRANSPORT_DEPARTMENT;
      docType = "Driving Licence";
    } else if (
      rawMsg.includes("marks") ||
      rawMsg.includes("sslc") ||
      rawMsg.includes("puc") ||
      rawMsg.includes("board")
    ) {
      auth = GOVERNMENT_AUTHORITIES.STATE_EDUCATION_BOARD;
      docType = "Marks Card";
    }

    return {
      response: `To correct your **${docType}**, you must submit a formal correction request through the official statutory authority: **${auth.name}** (${auth.shortName}).\n\n• **Official Portal:** ${auth.portalName}\n• **Process:** ${auth.officialProcessNote}\n\nDigiReady cannot alter official government records. Would you like help finding an official correction centre in your city?\n\nTell me which city you are currently in (e.g. *Bengaluru*, *Mysuru*, *Delhi*).`,
      suggestions: [
        "Find correction centres in Bengaluru",
        "Find correction centres in Delhi",
        "Do my documents have any conflicts?",
        "Check readiness for KCET",
      ],
    };
  }

  // 1. Handle explicit Eligibility inquiries
  if (
    rawMsg.includes("eligible") ||
    rawMsg.includes("eligibility") ||
    rawMsg.includes("age limit") ||
    rawMsg.includes("qualification for")
  ) {
    try {
      const serviceTarget = intent.service || "KCET";
      const eligibility = await evaluateServiceEligibility(demoUser.id, serviceTarget);
      const journey = await getApplicationJourney(demoUser.id, serviceTarget);

      let responseText = "";
      if (eligibility.overallStatus === "ELIGIBLE") {
        responseText = `Based on the information available in your DigiReady profile and vault, you are **eligible** for **${eligibility.serviceName}**!\n\n${eligibility.summary}`;
      } else if (eligibility.overallStatus === "NOT_ELIGIBLE") {
        responseText = `Based on the information available to DigiReady, you may not currently meet one or more statutory eligibility conditions for **${eligibility.serviceName}**:\n\n${eligibility.summary}\n\nSource: ${eligibility.sourceReference}`;
      } else {
        responseText = `To evaluate your eligibility for **${eligibility.serviceName}**, DigiReady needs additional profile details (${eligibility.missingFields.join(", ")}).\n\n${eligibility.summary}`;
      }

      return {
        response: responseText,
        journey: journey ?? null,
        suggestions: [
          `Check readiness for ${eligibility.serviceName}`,
          `What documents do I need for ${eligibility.serviceName}?`,
          "Check my documents",
          "Do my documents have any conflicts?",
        ],
      };
    } catch {
      // Fall through
    }
  }

  // 2. Handle explicit Deadline & Application Window inquiries
  if (
    rawMsg.includes("deadline") ||
    rawMsg.includes("last date") ||
    rawMsg.includes("when does") ||
    rawMsg.includes("when is") ||
    rawMsg.includes("registration close") ||
    rawMsg.includes("application window") ||
    rawMsg.includes("exam date")
  ) {
    try {
      const serviceTarget = intent.service || "KCET";
      const windowInfo = await getApplicationWindowInfo(serviceTarget);
      const journey = await getApplicationJourney(demoUser.id, serviceTarget);

      let responseText = `Here is the current official schedule for **${windowInfo.serviceName}**:\n\n• **Status:** ${windowInfo.statusLabel}`;
      if (windowInfo.applicationStart) {
        responseText += `\n• **Registration Opens:** ${new Date(windowInfo.applicationStart).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
      }
      if (windowInfo.applicationEnd) {
        responseText += `\n• **Application Deadline:** ${new Date(windowInfo.applicationEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
      }
      if (windowInfo.examDate) {
        responseText += `\n• **Exam Date:** ${new Date(windowInfo.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
      }
      if (windowInfo.notes) {
        responseText += `\n\n${windowInfo.notes}`;
      }
      responseText += `\n\n*Source: ${windowInfo.sourceReference}*`;

      return {
        response: responseText,
        journey: journey ?? null,
        suggestions: [
          `Check readiness for ${windowInfo.serviceName}`,
          `Am I eligible for ${windowInfo.serviceName}?`,
          `What documents do I need for ${windowInfo.serviceName}?`,
        ],
      };
    } catch {
      // Fall through
    }
  }

  // 3. Handle explicit consistency / conflict inquiries
  if (
    rawMsg.includes("conflict") ||
    rawMsg.includes("mismatch") ||
    rawMsg.includes("consistency") ||
    rawMsg.includes("different") ||
    rawMsg.includes("differ") ||
    rawMsg.includes("why is my application not ready") ||
    rawMsg.includes("why am i not ready") ||
    rawMsg.includes("why can't i apply") ||
    rawMsg.includes("why cannot i apply") ||
    rawMsg.includes("what is blocking") ||
    rawMsg.includes("blocking me") ||
    rawMsg.includes("not verified")
  ) {
    try {
      const consistency = await getVaultConsistencyAssessment(demoUser.id);
      const journey = await getApplicationJourney(demoUser.id, intent.service || "KCET");

      if (
        consistency.hasConflicts ||
        rawMsg.includes("different") ||
        rawMsg.includes("differ") ||
        rawMsg.includes("mismatch") ||
        rawMsg.includes("conflict")
      ) {
        const conflict = consistency.conflicts[0];
        const affected =
          conflict?.entries.map((e) => `${e.documentDisplayName} ("${e.rawValue}")`).join(" and ") ||
          "your documents";

        return {
          response: `I found an identity conflict in your documents (${conflict?.fieldLabel || "Details"} differs between ${affected}).\n\nDigiReady cannot change the information on either official document or alter government records. The next step is to determine which record needs correction and follow the appropriate issuing authority's official correction process.\n\nFor Aadhaar, the relevant statutory authority is UIDAI. Would you like help locating an authorized correction centre near your city?`,
          consistency,
          journey: journey ?? null,
          suggestions: [
            "Find correction centres in Bengaluru",
            "I want to apply for KCET",
            "Check readiness for JEE Main",
            "What documents am I missing?",
          ],
        };
      } else if (journey && journey.blockers && journey.blockers.length > 0) {
        const blockerList = journey.blockers
          .map((b, i) => `${i + 1}. **${b.title}**: ${b.description}`)
          .join("\n");

        return {
          response: `You are currently preparing for **${journey.serviceName}**, but **${journey.blockers.length} item(s) need attention** before you are ready to apply:\n\n${blockerList}\n\nReview the guidance and action steps in your Application Journey.`,
          consistency,
          journey: journey ?? null,
          suggestions: [
            "Check my documents",
            "How do I fix my document conflict?",
            `Am I eligible for ${journey.serviceName}?`,
          ],
        };
      } else {
        return {
          response: `Great news! I checked your vault documents across Name, Date of Birth, Parent Name, Gender, and Address. **No cross-document identity conflicts were detected.**`,
          consistency,
          journey: journey ?? null,
          suggestions: [
            "I want to apply for KCET",
            "Check readiness for JEE Main",
            "What documents do I need for a Passport?",
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
          response: "Sure! Which examination, scholarship, or public service are you preparing for?",
          suggestions: [
            "I want to apply for KCET",
            "Check readiness for JEE Main",
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
            response: `I can help you check document readiness, but I don't have requirements configured for **${intent.service}** yet. You can explore registered examinations, scholarships, and citizen services on the Services page.`,
            suggestions: [
              "I want to apply for KCET",
              "Check readiness for JEE Main",
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
