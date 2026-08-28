import { resolveDocumentType } from "@/server/ontology";
import type { PrismaClient, DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface DetectionResult {
  detectedType: DocumentType | null;
  canonicalKey: string;
  displayName: string;
  confidence: number;
  status: "SUCCESS" | "NEEDS_REVIEW" | "UNSUPPORTED";
  matchedCue?: string;
  warnings: string[];
}

interface EvidenceRule {
  canonicalKey: string;
  displayName: string;
  primaryPatterns: RegExp[];
  supportingPatterns: RegExp[];
  negativePatterns?: RegExp[];
  minimumScore: number;
}

const EVIDENCE_RULES: EvidenceRule[] = [
  {
    canonicalKey: "INCOME_CERTIFICATE",
    displayName: "Income Certificate",
    primaryPatterns: [
      /\b(income\s*certificate|certificate\s*of\s*income|annual\s*family\s*income|gross\s*annual\s*income|income\s*and\s*asset\s*certificate)\b/i,
      /\b(tahsildar|revenue\s*department|revenue\s*officer|nadakacheri|meeseva|e-district)\b/i,
      /\b(rd00\d+|rd\d{8,}|income\s*and\s*asset)\b/i,
    ],
    supportingPatterns: [
      /\b(annual\s*income|family\s*income|total\s*income|income\s*from\s*all\s*sources)\b/i,
      /\b(rs\.?|rupees|inr|per\s*annum|\bpa\b)\b/i,
      /\b(applicant|father|guardian|village|taluk|district|tahsil)\b/i,
      /\b(valid\s*for|financial\s*year|certificate\s*no|application\s*no)\b/i,
    ],
    negativePatterns: [
      /\b(marks\s*card|statement\s*of\s*marks|secondary\s*school|pre-university|puc|sslc|cbse|icse)\b/i,
      /\b(passport\s*of\s*india|driving\s*licen[cs]e|election\s*commission)\b/i,
    ],
    minimumScore: 0.50,
  },
  {
    canonicalKey: "SECONDARY_MARKS_CARD",
    displayName: "10th / Secondary Marks Card",
    primaryPatterns: [
      /\b(secondary\s*school\s*leaving\s*certificate|sslc\s*marks|sslc\s*examination|class\s*10th|class\s*x\s*examination|matriculation\s*examination|10th\s*standard|high\s*school\s*examination|sslc)\b/i,
      /\b(kseeb|karnataka\s*secondary\s*education|cbse\s*class\s*10|icse\s*class\s*10|state\s*board\s*of\s*secondary|board\s*of\s*secondary\s*education)\b/i,
    ],
    supportingPatterns: [
      /\b(marks\s*card|statement\s*of\s*marks|marks\s*obtained|max\s*marks|grand\s*total|result\s*:\s*pass)\b/i,
      /\b(registration\s*no|register\s*no|roll\s*no|candidate\s*name|student\s*name|date\s*of\s*birth|passing\s*year)\b/i,
      /\b(first\s*language|second\s*language|mathematics|science|social\s*science|kannada|english)\b/i,
    ],
    negativePatterns: [
      /\b(higher\s*secondary|2nd\s*puc|class\s*12|class\s*xii|pre-university|plus\s*two)\b/i,
      /\b(income\s*certificate|caste\s*certificate|aadhaar)\b/i,
    ],
    minimumScore: 0.50,
  },
  {
    canonicalKey: "HIGHER_SECONDARY_MARKS_CARD",
    displayName: "12th / Higher Secondary Marks Card",
    primaryPatterns: [
      /\b(higher\s*secondary\s*certificate|pre\s*university\s*certificate|2nd\s*puc\s*marks|second\s*puc|puc\s*marks\s*card|class\s*12th|class\s*xii\s*examination|plus\s*two\s*higher\s*secondary|senior\s*school\s*certificate|2nd\s*puc|puc)\b/i,
      /\b(department\s*of\s*pre-university|pue\s*department|dpue|higher\s*secondary\s*board|cbse\s*class\s*12|isc\s*class\s*12)\b/i,
    ],
    supportingPatterns: [
      /\b(marks\s*card|statement\s*of\s*marks|physics|chemistry|mathematics|biology|commerce|accountancy|economics)\b/i,
      /\b(register\s*number|roll\s*no|college|stream|percentage|grade|total\s*marks)\b/i,
    ],
    negativePatterns: [
      /\b(secondary\s*school\s*leaving|class\s*10\b|class\s*x\b|matriculation)\b/i,
      /\b(income\s*certificate|aadhaar)\b/i,
    ],
    minimumScore: 0.50,
  },
  {
    canonicalKey: "GOVERNMENT_IDENTITY_PROOF",
    displayName: "Government Identity Proof",
    primaryPatterns: [
      /\b(unique\s*identification\s*authority|uidai|aadhaar|mera\s*aadhaar|election\s*commission\s*of\s*india|voter\s*id|epic\s*no)\b/i,
      /\b\d{4}\s\d{4}\s\d{4}\b/,
    ],
    supportingPatterns: [
      /\b(government\s*of\s*india|bharat\s*sarkar)\b/i,
      /\b(dob\s*:\s*\d|date\s*of\s*birth|year\s*of\s*birth|male|female|transgender)\b/i,
      /\b(enrolment\s*no|vid\s*:\s*\d|help@uidai\.gov\.in|www\.uidai\.gov\.in)\b/i,
      /\b(address\s*:|s\/o|w\/o|d\/o|c\/o)\b/i,
    ],
    negativePatterns: [
      /\b(marks\s*card|statement\s*of\s*marks|subject|maximum\s*marks|passing\s*marks)\b/i,
      /\b(annual\s*income\s*certificate|caste\s*certificate)\b/i,
    ],
    minimumScore: 0.50,
  },
  {
    canonicalKey: "CASTE_CERTIFICATE",
    displayName: "Caste / Category Certificate",
    primaryPatterns: [
      /\b(caste\s*certificate|category\s*certificate|community\s*certificate|caste\s*and\s*income\s*certificate)\b/i,
      /\b(form\s*d\b|form\s*e\b|form\s*f\b|scheduled\s*caste|scheduled\s*tribe|other\s*backward\s*classes?)\b/i,
      /\b(category-1|category-2a|category-2b|category-3a|category-3b|sc\/st|obc\s*certificate)\b/i,
    ],
    supportingPatterns: [
      /\b(tahsildar|revenue\s*officer|sub-caste|religion|hindu|muslim|christian)\b/i,
      /\b(certificate\s*number|gsc\s*number|rd\d+)\b/i,
    ],
    negativePatterns: [
      /\b(marks\s*card|secondary\s*school|pre-university)\b/i,
    ],
    minimumScore: 0.50,
  },
  {
    canonicalKey: "STUDY_CERTIFICATE",
    displayName: "Study Certificate",
    primaryPatterns: [
      /\b(study\s*certificate|bonafide\s*certificate|character\s*and\s*study\s*certificate|study\s*and\s*conduct\s*certificate)\b/i,
    ],
    supportingPatterns: [
      /\b(head\s*master|principal|institution|school|academic\s*years?|studied\s*in\s*this\s*institution)\b/i,
      /\b(block\s*education\s*officer|beo|ddpi|consecutive\s*years|from\s*class|to\s*class)\b/i,
      /\b(standard|class\s*\d|medium\s*of\s*instruction)\b/i,
    ],
    negativePatterns: [
      /\b(income\s*certificate|aadhaar|uidai)\b/i,
    ],
    minimumScore: 0.50,
  },
  {
    canonicalKey: "PASSPORT",
    displayName: "Passport",
    primaryPatterns: [
      /\b(passport|republic\s*of\s*india|passport\s*no|type\s*p\b|country\s*code\s*ind)\b/i,
    ],
    supportingPatterns: [
      /\b(given\s*name|surname|nationality|place\s*of\s*birth|date\s*of\s*expiry)\b/i,
    ],
    negativePatterns: [
      /\b(marks\s*card|secondary\s*school|college)\b/i,
    ],
    minimumScore: 0.50,
  },
];

/**
 * Deterministically evaluates textual and visual evidence to detect the document type.
 *
 * Rules:
 *  1. Automatic detection requires genuine OCR evidence (minimum score >= 0.50).
 *  2. Filename alone can NEVER exceed minimumScore and cannot classify an arbitrary image.
 *  3. Explicit user override sets the type, but is evaluated against OCR text:
 *     - Strong OCR evidence => SUCCESS (confidence 0.85-1.0)
 *     - Weak / No OCR evidence => NEEDS_REVIEW (confidence 0.20-0.40) with honest warning.
 *  4. Insufficient evidence always returns UNKNOWN / NEEDS_REVIEW (confidence 0.0).
 */
export async function detectDocumentType(
  fileName: string,
  rawText?: string,
  typeOverride?: string,
  db: PrismaClient = prisma
): Promise<DetectionResult> {
  const warnings: string[] = [];
  const cleanText = (rawText || "").trim();
  const cleanFileName = (fileName || "").toLowerCase().replace(/[_\-.]+/g, " ").trim();

  // Helper to score OCR text & filename against a specific rule
  const evaluateRule = (rule: EvidenceRule): { score: number; cues: string[] } => {
    let score = 0;
    const cues: string[] = [];

    // Negative pattern disqualification
    if (rule.negativePatterns) {
      for (const neg of rule.negativePatterns) {
        if (neg.test(cleanText) || (cleanFileName && neg.test(cleanFileName))) {
          return { score: -1, cues: ["NEGATIVE_MATCH"] };
        }
      }
    }

    // Primary patterns (OCR text is high signal)
    let ocrMatched = false;
    for (const pattern of rule.primaryPatterns) {
      if (cleanText && pattern.test(cleanText)) {
        score += 0.60;
        ocrMatched = true;
        cues.push("PRIMARY_OCR_MATCH");
      }
    }

    // Supporting patterns
    for (const pattern of rule.supportingPatterns) {
      if (cleanText && pattern.test(cleanText)) {
        score += 0.25;
        ocrMatched = true;
        cues.push("SUPPORTING_OCR_MATCH");
      }
    }

    // Filename hint provides at most a single small hint (+0.15), capped so it can NEVER reach 0.50 threshold on its own
    let filenameMatched = false;
    for (const pattern of rule.primaryPatterns) {
      if (cleanFileName && pattern.test(cleanFileName)) {
        filenameMatched = true;
        break;
      }
    }
    if (!filenameMatched) {
      for (const pattern of rule.supportingPatterns) {
        if (cleanFileName && pattern.test(cleanFileName)) {
          filenameMatched = true;
          break;
        }
      }
    }

    if (filenameMatched) {
      score += 0.15;
      cues.push("FILENAME_HINT");
    }

    if (!ocrMatched) {
      score = Math.min(0.20, score);
    }

    return { score: Math.min(1.0, score), cues };
  };

  // ── 1. Explicit User Manual Selection / Override ────────────────────────
  if (typeOverride && typeOverride.trim()) {
    const resolved = await resolveDocumentType(typeOverride.trim(), db);
    const rule = EVIDENCE_RULES.find((r) => r.canonicalKey === typeOverride.trim() || r.displayName.toLowerCase() === typeOverride.trim().toLowerCase());

    let evidenceScore = 0;
    let cues: string[] = ["USER_MANUAL_SELECTION"];

    if (rule) {
      const evalRes = evaluateRule(rule);
      evidenceScore = Math.max(0, evalRes.score);
      cues.push(...evalRes.cues);
    }

    const canonicalKey = resolved?.canonicalKey || typeOverride.trim();
    const displayName = resolved?.displayName || rule?.displayName || typeOverride.trim();

    // Differentiate whether OCR evidence actually supports this manual selection
    if (evidenceScore >= 0.50) {
      return {
        detectedType: resolved,
        canonicalKey,
        displayName,
        confidence: Math.max(0.85, Math.round(evidenceScore * 100) / 100),
        status: "SUCCESS",
        matchedCue: cues.join(", "),
        warnings: [],
      };
    } else if (evidenceScore >= 0.20) {
      warnings.push("Document type manually selected. OCR found partial evidence; please verify extracted information.");
      return {
        detectedType: resolved,
        canonicalKey,
        displayName,
        confidence: Math.round(evidenceScore * 100) / 100,
        status: "NEEDS_REVIEW",
        matchedCue: cues.join(", "),
        warnings,
      };
    } else {
      warnings.push("Document type was manually specified, but DigiReady could not verify matching document text in this image. Fields require manual review.");
      return {
        detectedType: resolved,
        canonicalKey,
        displayName,
        confidence: 0.20,
        status: "NEEDS_REVIEW",
        matchedCue: cues.join(", "),
        warnings,
      };
    }
  }

  // ── 2. Automatic Evidence-Based Detection ──────────────────────────────
  let bestRule: EvidenceRule | null = null;
  let highestScore = 0;
  let matchedCueName = "";

  for (const rule of EVIDENCE_RULES) {
    const { score, cues } = evaluateRule(rule);
    if (score >= rule.minimumScore && score > highestScore) {
      highestScore = score;
      bestRule = rule;
      matchedCueName = cues.join(", ");
    }
  }

  // If evidence met threshold (>= 0.50), resolve via ontology
  if (bestRule && highestScore >= bestRule.minimumScore) {
    const resolved = await resolveDocumentType(bestRule.canonicalKey, db);
    return {
      detectedType: resolved,
      canonicalKey: resolved ? resolved.canonicalKey : bestRule.canonicalKey,
      displayName: resolved ? resolved.displayName : bestRule.displayName,
      confidence: Math.round(highestScore * 100) / 100,
      status: "SUCCESS",
      matchedCue: matchedCueName,
      warnings: [],
    };
  }

  // ── 3. Insufficient / No Document Evidence -> Return UNKNOWN ────────────
  // (NEVER DEFAULT TO A KNOWN DOCUMENT TYPE OR DEMO IDENTITY CARD)
  warnings.push("Document type could not be determined. We couldn't find sufficient document evidence in this image.");
  return {
    detectedType: null,
    canonicalKey: "UNKNOWN",
    displayName: "Unidentified Document",
    confidence: 0.0,
    status: "NEEDS_REVIEW",
    warnings,
  };
}
