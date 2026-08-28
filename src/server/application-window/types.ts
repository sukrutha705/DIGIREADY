/**
 * DigiReady - Application Window Domain Types
 * Phase 9.2: Time-Aware Application Schedules & Deadline Intelligence
 */

export const ApplicationWindowStatuses = {
  UPCOMING: "UPCOMING",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ApplicationWindowStatus =
  (typeof ApplicationWindowStatuses)[keyof typeof ApplicationWindowStatuses];

export interface ApplicationWindowInfo {
  serviceId: string;
  serviceName: string;
  slug?: string;
  status: ApplicationWindowStatus;
  statusLabel: string;
  applicationStart?: string | null; // ISO Date string
  applicationEnd?: string | null;   // ISO Date string
  correctionWindowStart?: string | null;
  correctionWindowEnd?: string | null;
  examDate?: string | null;
  resultDate?: string | null;
  daysRemaining?: number | null;
  notes: string;
  sourceReference: string;
  sourceUrl?: string | null;
  lastReviewedAt?: string | null;
  officialWebsite?: string | null;
  officialApplicationUrl?: string | null;
  disclaimer: string;
}

export interface ServiceWindowSchedule {
  serviceId: string;
  serviceName: string;
  applicationStart?: string;
  applicationEnd?: string;
  correctionWindowStart?: string;
  correctionWindowEnd?: string;
  examDate?: string;
  resultDate?: string;
  notes?: string;
  sourceReference: string;
  sourceUrl?: string;
  lastReviewedAt?: string;
}
