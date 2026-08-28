import {
  ExtractedField,
  DocumentExtractionResult,
  ExtractionStatus,
} from "./types";
import {
  normalizeName,
  normalizeDob,
  normalizeGender,
  normalizeParentName,
  normalizeAddress,
} from "@/server/consistency/policy";

export interface ExtractionContext {
  canonicalKey: string;
  displayName: string;
  fileName: string;
  rawText?: string;
  metadataHints?: Record<string, string>;
}

/**
 * Validates whether an extracted string resembles a valid candidate or person name.
 */
function isValidPersonName(str: string): boolean {
  if (!str || str.trim().length < 2) return false;
  // Exclude strings containing numbers, code tokens, or excessive punctuation
  if (/\d/.test(str)) return false;
  if (/^(document|certificate|card|government|department|authority|signature|photo)$/i.test(str.trim())) return false;
  return /^[A-Za-z\s.]{2,60}$/.test(str.trim());
}

/**
 * Validates whether an extracted string resembles a plausible calendar date.
 */
function isValidDateString(str: string): boolean {
  if (!str || str.trim().length < 4) return false;
  const match = str.match(/(\d{4})|(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  return !!match;
}

/**
 * Cleans extracted monetary income string to standard format.
 */
function cleanIncomeString(str: string): string {
  if (!str) return "";
  const numeric = str.replace(/[^0-9]/g, "");
  if (!numeric || numeric.length < 3) return "";
  const intVal = parseInt(numeric, 10);
  if (isNaN(intVal) || intVal <= 0) return "";
  return `₹ ${intVal.toLocaleString("en-IN")}`;
}

/**
 * Extracts schema-specific fields strictly from genuine OCR text and explicit user hints.
 * NEVER invents, hardcodes, or defaults candidate data.
 */
export function extractFieldsForDocument(
  context: ExtractionContext
): DocumentExtractionResult {
  const { canonicalKey, displayName, fileName, rawText = "", metadataHints = {} } = context;
  const warnings: string[] = [];
  const fields: ExtractedField[] = [];

  // Helper to extract a field from user metadataHints or OCR regex
  const extractField = (
    keys: string[],
    regexPattern?: RegExp,
    validator?: (val: string) => boolean
  ): { value: string; found: boolean; source: "USER_HINT" | "OCR" | "NONE" } => {
    // 1. User manual input / metadata hint takes highest priority
    for (const key of keys) {
      if (metadataHints[key] && metadataHints[key].trim()) {
        const val = metadataHints[key].trim();
        if (!validator || validator(val)) {
          return { value: val, found: true, source: "USER_HINT" };
        }
      }
    }

    // 2. OCR text extraction
    if (rawText && regexPattern) {
      const match = rawText.match(regexPattern);
      if (match && match[1] && match[1].trim()) {
        const val = match[1].trim();
        if (!validator || validator(val)) {
          return { value: val, found: true, source: "OCR" };
        }
      }
    }

    return { value: "", found: false, source: "NONE" };
  };

  let issuer = metadataHints["issuer"] || "";
  let issueDate: string | null = metadataHints["issueDate"] || null;
  let expiryDate: string | null = metadataHints["expiryDate"] || null;

  // Unknown or Unidentified Document
  if (canonicalKey === "UNKNOWN" || !canonicalKey) {
    warnings.push("Document type could not be determined. Please choose the document type manually.");
    return {
      documentTypeKey: "UNKNOWN",
      status: "NEEDS_REVIEW",
      confidence: 0.0,
      issuer: "Unknown Authority",
      issueDate: null,
      expiryDate: null,
      fields: [],
      warnings,
    };
  }

  switch (canonicalKey) {
    case "GOVERNMENT_IDENTITY_PROOF": {
      if (!issuer) {
        if (/aadhaar|uidai/i.test(rawText)) {
          issuer = "Unique Identification Authority of India";
        } else if (/election\s*commission/i.test(rawText)) {
          issuer = "Election Commission of India";
        } else {
          issuer = "Statutory Identity Authority";
        }
      }

      const nameRes = extractField(
        ["fullName", "name", "candidateName"],
        /(?:Name|To)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const dobRes = extractField(
        ["dateOfBirth", "dob"],
        /(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth|YOB)[:\s]+([0-9\-/.]+)/i,
        isValidDateString
      );
      const genderRes = extractField(
        ["gender", "sex"],
        /(?:Gender|Sex)[:\s/]+(Male|Female|Transgender|M|F)\b/i
      );
      const addrRes = extractField(
        ["address"],
        /(?:Address|Addr)[:\s]+([^\n\r]{8,120})/i
      );
      const refRes = extractField(
        ["documentRef", "aadhaarNumber", "idNumber"],
        /(?:Aadhaar|UID|VID|Card\s*No|EPIC)[:\s]*([0-9\sA-Z-]{8,20})/i
      );

      // Name field
      fields.push({
        fieldId: "fullName",
        fieldName: "fullName",
        fieldType: "NAME",
        semanticRole: "CANDIDATE_NAME",
        value: nameRes.value,
        normalizedValue: nameRes.found ? normalizeName(nameRes.value) : "",
        confidence: nameRes.found ? (nameRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: nameRes.found ? "FOUND" : "UNCONFIRMED",
      });
      if (!nameRes.found) {
        warnings.push("Candidate name could not be reliably extracted from image.");
      }

      // DOB field
      fields.push({
        fieldId: "dateOfBirth",
        fieldName: "dateOfBirth",
        fieldType: "DATE",
        semanticRole: "DATE_OF_BIRTH",
        value: dobRes.value,
        normalizedValue: dobRes.found ? normalizeDob(dobRes.value) : "",
        confidence: dobRes.found ? (dobRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: dobRes.found ? "FOUND" : "UNCONFIRMED",
      });
      if (!dobRes.found) {
        warnings.push("Date of birth could not be reliably extracted from image.");
      }

      // Optional Gender
      if (genderRes.found) {
        fields.push({
          fieldId: "gender",
          fieldName: "gender",
          fieldType: "TEXT",
          semanticRole: "GENDER",
          value: genderRes.value,
          normalizedValue: normalizeGender(genderRes.value),
          confidence: genderRes.source === "USER_HINT" ? 1.0 : 0.85,
          status: "FOUND",
        });
      }

      // Optional Address
      if (addrRes.found) {
        fields.push({
          fieldId: "address",
          fieldName: "address",
          fieldType: "ADDRESS",
          semanticRole: "ADDRESS",
          value: addrRes.value,
          normalizedValue: normalizeAddress(addrRes.value),
          confidence: addrRes.source === "USER_HINT" ? 1.0 : 0.8,
          status: "FOUND",
        });
      }

      // Identifier / Reference
      if (refRes.found) {
        fields.push({
          fieldId: "documentRef",
          fieldName: "documentRef",
          fieldType: "IDENTIFIER",
          semanticRole: "IDENTIFIER",
          value: refRes.value,
          normalizedValue: refRes.value.replace(/\s+/g, ""),
          confidence: refRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }
      break;
    }

    case "SECONDARY_MARKS_CARD": {
      if (!issuer) {
        issuer = /cbse/i.test(rawText)
          ? "Central Board of Secondary Education"
          : /icse|cisce/i.test(rawText)
          ? "Council for the Indian School Certificate Examinations"
          : "Karnataka School Examination and Assessment Board (KSEEB)";
      }

      const nameRes = extractField(
        ["candidateName", "fullName", "name"],
        /(?:Candidate(?:'s)?\s*Name|Student(?:'s)?\s*Name|Name)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const parentRes = extractField(
        ["fatherName", "parentName"],
        /(?:Father(?:'s)?\s*Name|Parent(?:'s)?\s*Name|Father)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const dobRes = extractField(
        ["dateOfBirth", "dob"],
        /(?:DOB|Date\s*of\s*Birth|D\.O\.B)[:\s]+([0-9\-/.]+)/i,
        isValidDateString
      );
      const instRes = extractField(
        ["institution", "school"],
        /(?:School|Institution|College)[:\s]+([^\n\r]{4,80})/i
      );
      const boardRes = extractField(
        ["board"],
        /(?:Board|Council)[:\s]+([^\n\r]{4,80})/i
      );
      const yearRes = extractField(
        ["passingYear", "year"],
        /(?:Passing\s*Year|Year\s*of\s*Passing|Exam\s*Year|Year)[:\s]+([12][09][0-9]{2})/i
      );
      const regRes = extractField(
        ["registrationNumber", "regNo", "rollNo"],
        /(?:Registration\s*No|Register\s*Number|Reg\s*No|Roll\s*No)[:\s]*([0-9A-Z\/-]{4,20})/i
      );

      // Candidate Name
      fields.push({
        fieldId: "candidateName",
        fieldName: "candidateName",
        fieldType: "NAME",
        semanticRole: "CANDIDATE_NAME",
        value: nameRes.value,
        normalizedValue: nameRes.found ? normalizeName(nameRes.value) : "",
        confidence: nameRes.found ? (nameRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: nameRes.found ? "FOUND" : "UNCONFIRMED",
      });
      if (!nameRes.found) {
        warnings.push("Candidate name could not be reliably extracted from image.");
      }

      // Father Name
      fields.push({
        fieldId: "fatherName",
        fieldName: "fatherName",
        fieldType: "NAME",
        semanticRole: "PARENT_NAME",
        value: parentRes.value,
        normalizedValue: parentRes.found ? normalizeParentName(parentRes.value) : "",
        confidence: parentRes.found ? (parentRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: parentRes.found ? "FOUND" : "UNCONFIRMED",
      });

      // DOB
      fields.push({
        fieldId: "dateOfBirth",
        fieldName: "dateOfBirth",
        fieldType: "DATE",
        semanticRole: "DATE_OF_BIRTH",
        value: dobRes.value,
        normalizedValue: dobRes.found ? normalizeDob(dobRes.value) : "",
        confidence: dobRes.found ? (dobRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: dobRes.found ? "FOUND" : "UNCONFIRMED",
      });

      // Institution
      if (instRes.found) {
        fields.push({
          fieldId: "institution",
          fieldName: "institution",
          fieldType: "ORGANIZATION",
          semanticRole: "ORGANIZATION",
          value: instRes.value,
          normalizedValue: instRes.value.trim().toUpperCase(),
          confidence: instRes.source === "USER_HINT" ? 1.0 : 0.85,
          status: "FOUND",
        });
      }

      // Board
      if (boardRes.found) {
        fields.push({
          fieldId: "board",
          fieldName: "board",
          fieldType: "ORGANIZATION",
          semanticRole: "ORGANIZATION",
          value: boardRes.value,
          normalizedValue: boardRes.value.trim().toUpperCase(),
          confidence: boardRes.source === "USER_HINT" ? 1.0 : 0.85,
          status: "FOUND",
        });
      }

      // Passing Year
      if (yearRes.found) {
        fields.push({
          fieldId: "passingYear",
          fieldName: "passingYear",
          fieldType: "TEXT",
          semanticRole: "OTHER",
          value: yearRes.value,
          normalizedValue: yearRes.value.trim(),
          confidence: yearRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }

      // Registration Number
      if (regRes.found) {
        fields.push({
          fieldId: "registrationNumber",
          fieldName: "registrationNumber",
          fieldType: "IDENTIFIER",
          semanticRole: "IDENTIFIER",
          value: regRes.value,
          normalizedValue: regRes.value.trim().toUpperCase(),
          confidence: regRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }
      break;
    }

    case "HIGHER_SECONDARY_MARKS_CARD": {
      if (!issuer) {
        issuer = "Department of Pre-University Education / Higher Secondary Board";
      }

      const nameRes = extractField(
        ["candidateName", "fullName", "name"],
        /(?:Candidate(?:'s)?\s*Name|Student(?:'s)?\s*Name|Name)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const parentRes = extractField(
        ["fatherName", "parentName"],
        /(?:Father(?:'s)?\s*Name|Parent(?:'s)?\s*Name|Father)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const dobRes = extractField(
        ["dateOfBirth", "dob"],
        /(?:DOB|Date\s*of\s*Birth|D\.O\.B)[:\s]+([0-9\-/.]+)/i,
        isValidDateString
      );
      const boardRes = extractField(
        ["board"],
        /(?:Board|Council|Department)[:\s]+([^\n\r]{4,80})/i
      );
      const yearRes = extractField(
        ["passingYear", "year"],
        /(?:Passing\s*Year|Year\s*of\s*Passing|Exam\s*Year|Year)[:\s]+([12][09][0-9]{2})/i
      );
      const regRes = extractField(
        ["registrationNumber", "regNo", "rollNo"],
        /(?:Registration\s*No|Register\s*Number|Reg\s*No|Roll\s*No)[:\s]*([0-9A-Z\/-]{4,20})/i
      );

      // Candidate Name
      fields.push({
        fieldId: "candidateName",
        fieldName: "candidateName",
        fieldType: "NAME",
        semanticRole: "CANDIDATE_NAME",
        value: nameRes.value,
        normalizedValue: nameRes.found ? normalizeName(nameRes.value) : "",
        confidence: nameRes.found ? (nameRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: nameRes.found ? "FOUND" : "UNCONFIRMED",
      });
      if (!nameRes.found) {
        warnings.push("Candidate name could not be reliably extracted from image.");
      }

      // Father Name
      fields.push({
        fieldId: "fatherName",
        fieldName: "fatherName",
        fieldType: "NAME",
        semanticRole: "PARENT_NAME",
        value: parentRes.value,
        normalizedValue: parentRes.found ? normalizeParentName(parentRes.value) : "",
        confidence: parentRes.found ? (parentRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: parentRes.found ? "FOUND" : "UNCONFIRMED",
      });

      // DOB
      fields.push({
        fieldId: "dateOfBirth",
        fieldName: "dateOfBirth",
        fieldType: "DATE",
        semanticRole: "DATE_OF_BIRTH",
        value: dobRes.value,
        normalizedValue: dobRes.found ? normalizeDob(dobRes.value) : "",
        confidence: dobRes.found ? (dobRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: dobRes.found ? "FOUND" : "UNCONFIRMED",
      });

      if (boardRes.found) {
        fields.push({
          fieldId: "board",
          fieldName: "board",
          fieldType: "ORGANIZATION",
          semanticRole: "ORGANIZATION",
          value: boardRes.value,
          normalizedValue: boardRes.value.trim().toUpperCase(),
          confidence: boardRes.source === "USER_HINT" ? 1.0 : 0.85,
          status: "FOUND",
        });
      }

      if (yearRes.found) {
        fields.push({
          fieldId: "passingYear",
          fieldName: "passingYear",
          fieldType: "TEXT",
          semanticRole: "OTHER",
          value: yearRes.value,
          normalizedValue: yearRes.value.trim(),
          confidence: yearRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }

      if (regRes.found) {
        fields.push({
          fieldId: "registrationNumber",
          fieldName: "registrationNumber",
          fieldType: "IDENTIFIER",
          semanticRole: "IDENTIFIER",
          value: regRes.value,
          normalizedValue: regRes.value.trim().toUpperCase(),
          confidence: regRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }
      break;
    }

    case "INCOME_CERTIFICATE": {
      if (!issuer) {
        issuer = "Department of Revenue, Government of Karnataka";
      }

      const nameRes = extractField(
        ["applicantName", "fullName", "name"],
        /(?:Applicant(?:'s)?\s*Name|Candidate(?:'s)?\s*Name|Name)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const parentRes = extractField(
        ["fatherName", "parentName"],
        /(?:Father(?:'s)?\s*Name|Parent(?:'s)?\s*Name|Father)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const incomeRes = extractField(
        ["annualIncome", "income"],
        /(?:Annual\s*Income|Gross\s*Annual\s*Income|Family\s*Income|Income)[:\s]+(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
      );
      const certRes = extractField(
        ["certificateRef", "certNo", "applicationNumber", "gscNo"],
        /(?:Certificate\s*No|Certificate\s*Number|GSC\s*No|RD\s*No|Ref\s*No)[:\s]*([0-9A-Z\/-]{6,24})/i
      );

      // Applicant Name
      fields.push({
        fieldId: "applicantName",
        fieldName: "applicantName",
        fieldType: "NAME",
        semanticRole: "CANDIDATE_NAME",
        value: nameRes.value,
        normalizedValue: nameRes.found ? normalizeName(nameRes.value) : "",
        confidence: nameRes.found ? (nameRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: nameRes.found ? "FOUND" : "UNCONFIRMED",
      });
      if (!nameRes.found) {
        warnings.push("Applicant name could not be reliably extracted from image.");
      }

      // Father Name
      fields.push({
        fieldId: "fatherName",
        fieldName: "fatherName",
        fieldType: "NAME",
        semanticRole: "PARENT_NAME",
        value: parentRes.value,
        normalizedValue: parentRes.found ? normalizeParentName(parentRes.value) : "",
        confidence: parentRes.found ? (parentRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: parentRes.found ? "FOUND" : "UNCONFIRMED",
      });

      // Annual Income
      const cleanedIncome = cleanIncomeString(incomeRes.value);
      fields.push({
        fieldId: "annualIncome",
        fieldName: "annualIncome",
        fieldType: "CURRENCY",
        semanticRole: "INCOME",
        value: cleanedIncome,
        normalizedValue: cleanedIncome,
        confidence: incomeRes.found && cleanedIncome ? (incomeRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: incomeRes.found && cleanedIncome ? "FOUND" : "UNCONFIRMED",
      });
      if (!incomeRes.found || !cleanedIncome) {
        warnings.push("Annual income amount could not be reliably extracted from image.");
      }

      // Certificate Number
      if (certRes.found) {
        fields.push({
          fieldId: "certificateRef",
          fieldName: "certificateRef",
          fieldType: "IDENTIFIER",
          semanticRole: "IDENTIFIER",
          value: certRes.value,
          normalizedValue: certRes.value.trim().toUpperCase(),
          confidence: certRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }
      break;
    }

    case "CASTE_CERTIFICATE":
    case "CASTE_INCOME_CERTIFICATE": {
      if (!issuer) {
        issuer = "Department of Revenue";
      }

      const nameRes = extractField(
        ["applicantName", "candidateName", "name"],
        /(?:Applicant(?:'s)?\s*Name|Candidate(?:'s)?\s*Name|Name)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const parentRes = extractField(
        ["fatherName", "parentName"],
        /(?:Father(?:'s)?\s*Name|Parent(?:'s)?\s*Name|Father)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );
      const categoryRes = extractField(
        ["category", "casteCategory"],
        /(?:Category|Caste|Community)[:\s]+([A-Za-z0-9\s\/-]{2,30})/i
      );
      const certRes = extractField(
        ["certificateRef", "certNo"],
        /(?:Certificate\s*No|Certificate\s*Number|GSC\s*No|RD\s*No)[:\s]*([0-9A-Z\/-]{6,24})/i
      );

      fields.push({
        fieldId: "applicantName",
        fieldName: "applicantName",
        fieldType: "NAME",
        semanticRole: "CANDIDATE_NAME",
        value: nameRes.value,
        normalizedValue: nameRes.found ? normalizeName(nameRes.value) : "",
        confidence: nameRes.found ? (nameRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: nameRes.found ? "FOUND" : "UNCONFIRMED",
      });

      fields.push({
        fieldId: "fatherName",
        fieldName: "fatherName",
        fieldType: "NAME",
        semanticRole: "PARENT_NAME",
        value: parentRes.value,
        normalizedValue: parentRes.found ? normalizeParentName(parentRes.value) : "",
        confidence: parentRes.found ? (parentRes.source === "USER_HINT" ? 1.0 : 0.9) : 0.0,
        status: parentRes.found ? "FOUND" : "UNCONFIRMED",
      });

      if (categoryRes.found) {
        fields.push({
          fieldId: "category",
          fieldName: "category",
          fieldType: "TEXT",
          semanticRole: "CATEGORY",
          value: categoryRes.value,
          normalizedValue: categoryRes.value.trim().toUpperCase(),
          confidence: categoryRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }

      if (certRes.found) {
        fields.push({
          fieldId: "certificateRef",
          fieldName: "certificateRef",
          fieldType: "IDENTIFIER",
          semanticRole: "IDENTIFIER",
          value: certRes.value,
          normalizedValue: certRes.value.trim().toUpperCase(),
          confidence: certRes.source === "USER_HINT" ? 1.0 : 0.9,
          status: "FOUND",
        });
      }
      break;
    }

    default: {
      // Generic fallback extractor for other document types
      if (!issuer) {
        issuer = "Competent Statutory Authority";
      }

      const nameRes = extractField(
        ["applicantName", "candidateName", "name"],
        /(?:Name|Applicant)[:\s]+([A-Za-z .]{2,40})/i,
        isValidPersonName
      );

      if (nameRes.found) {
        fields.push({
          fieldId: "applicantName",
          fieldName: "applicantName",
          fieldType: "NAME",
          semanticRole: "CANDIDATE_NAME",
          value: nameRes.value,
          normalizedValue: normalizeName(nameRes.value),
          confidence: nameRes.source === "USER_HINT" ? 1.0 : 0.85,
          status: "FOUND",
        });
      }
      break;
    }
  }

  // Calculate overall extraction confidence and status
  const confirmedFields = fields.filter((f) => f.status === "FOUND" && f.value.trim().length > 0);
  const primaryNameField = fields.find((f) => f.semanticRole === "CANDIDATE_NAME");

  let overallConfidence = 0;
  if (fields.length > 0) {
    const sumConfidence = fields.reduce((acc, f) => acc + (f.confidence || 0), 0);
    overallConfidence = Math.round((sumConfidence / fields.length) * 100) / 100;
  }

  let status: ExtractionStatus = "NEEDS_REVIEW";

  // Success requires: candidate name confirmed OR multiple verified fields
  if (confirmedFields.length >= 2 || (primaryNameField && primaryNameField.status === "FOUND" && confirmedFields.length >= 1)) {
    status = "SUCCESS";
  } else if (confirmedFields.length === 0) {
    status = "NEEDS_REVIEW";
    overallConfidence = 0.0;
  }

  return {
    documentTypeKey: canonicalKey,
    status,
    confidence: overallConfidence,
    issuer,
    issueDate,
    expiryDate,
    fields,
    warnings,
  };
}
