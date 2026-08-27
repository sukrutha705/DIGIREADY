/**
 * DigiReady - Assistant Domain Types
 * Phase 7.1, 7.2, 7.3 & 7.4: Assistant Intent, Readiness, Guidance & Verification Contracts
 */

import type { ServiceReadiness } from "@/server/services/types";
import type { DocumentGuidance } from "@/server/guidance/types";
import type { DocumentVerification } from "@/server/verification/types";
import type { SharePreviewDTO } from "@/server/sharing/types";
import type { ApplicationJourney } from "@/server/journey/types";

export const IntentTypes = {
  APPLY_FOR_SERVICE: "APPLY_FOR_SERVICE",
  CHECK_DOCUMENT: "CHECK_DOCUMENT",
  FIND_DOCUMENT: "FIND_DOCUMENT",
  MISSING_DOCUMENT: "MISSING_DOCUMENT",
  VERIFY_DOCUMENT: "VERIFY_DOCUMENT",
  SHARE_DOCUMENT: "SHARE_DOCUMENT",
  GENERAL_HELP: "GENERAL_HELP",
} as const;

export type IntentType = (typeof IntentTypes)[keyof typeof IntentTypes];

export interface AssistantIntent {
  intent: IntentType;
  service?: string;
  document?: string;
  recipient?: string;
  purpose?: string;
  confidence: number;
  originalMessage: string;
}

export interface AssistantResponseDTO {
  intent: AssistantIntent;
  friendlyResponse: string;
  suggestions?: string[];
  readiness?: ServiceReadiness | null;
  guidance?: DocumentGuidance | null;
  verification?: DocumentVerification | null;
  sharePreview?: SharePreviewDTO | null;
  journey?: ApplicationJourney | null;
}


