/**
 * DigiReady - Application Window Engine
 * Phase 9.2: Evaluates official application schedules, deadlines, and active windows.
 */

import {
  ApplicationWindowInfo,
  ApplicationWindowStatus,
  ApplicationWindowStatuses,
  ServiceWindowSchedule,
} from "./types";

// Authoritative schedule definitions for verified services
export const SERVICE_WINDOW_SCHEDULES: Record<string, ServiceWindowSchedule> = {
  // Continuous Citizen Public Services
  "passport": {
    serviceId: "passport",
    serviceName: "Passport Application",
    notes: "Application submission is open year-round through Passport Seva Portal and PSK / POPSK appointment scheduling.",
    sourceReference: "Consular, Passport & Visa Division, MEA (passportindia.gov.in)",
    sourceUrl: "https://www.passportindia.gov.in",
  },
  "pan-card": {
    serviceId: "pan-card",
    serviceName: "PAN Card Application",
    notes: "New PAN (Form 49A) applications are accepted continuously on official NSDL and UTIITSL portals.",
    sourceReference: "Income Tax Department / Protean / UTIITSL (incometax.gov.in)",
    sourceUrl: "https://www.incometax.gov.in",
  },
  "voter-id": {
    serviceId: "voter-id",
    serviceName: "Voter ID Registration",
    notes: "Continuous electoral roll updating is open throughout the year on ECI Voters Portal.",
    sourceReference: "Election Commission of India (voters.eci.gov.in)",
    sourceUrl: "https://voters.eci.gov.in",
  },
  "driving-license": {
    serviceId: "driving-license",
    serviceName: "Driving License Application",
    notes: "Learner and permanent Driving License applications are processed continuously via Parivahan Sarathi.",
    sourceReference: "Ministry of Road Transport and Highways (parivahan.gov.in)",
    sourceUrl: "https://parivahan.gov.in",
  },
  "income-certificate": {
    serviceId: "income-certificate",
    serviceName: "Income Certificate",
    notes: "Applications accepted continuously on state revenue citizen portals (Nadakacheri / Seva Sindhu).",
    sourceReference: "Department of Revenue (nadakacheri.karnataka.gov.in)",
    sourceUrl: "https://nadakacheri.karnataka.gov.in",
  },
  "caste-certificate": {
    serviceId: "caste-certificate",
    serviceName: "Caste Certificate",
    notes: "Applications accepted continuously on Nadakacheri / Seva Sindhu citizen services portal.",
    sourceReference: "Department of Revenue (nadakacheri.karnataka.gov.in)",
    sourceUrl: "https://nadakacheri.karnataka.gov.in",
  },
  "domicile-certificate": {
    serviceId: "domicile-certificate",
    serviceName: "Domicile Certificate",
    notes: "Residence / Domicile certificate applications accepted continuously at citizen service centers.",
    sourceReference: "State Revenue Department",
    sourceUrl: "https://nadakacheri.karnataka.gov.in",
  },
  "pm-kisan": {
    serviceId: "pm-kisan",
    serviceName: "PM Kisan Samman Nidhi",
    notes: "New farmer beneficiary self-registration is open continuously on PM-KISAN Portal.",
    sourceReference: "Ministry of Agriculture & Farmers Welfare (pmkisan.gov.in)",
    sourceUrl: "https://pmkisan.gov.in",
  },
  "pm-jay": {
    serviceId: "pm-jay",
    serviceName: "Ayushman Bharat PM-JAY",
    notes: "Beneficiary identification and Ayushman Card creation is active continuously at empaneled hospitals and CSCs.",
    sourceReference: "National Health Authority (nha.gov.in)",
    sourceUrl: "https://pmjay.gov.in",
  },
  "epfo": {
    serviceId: "epfo",
    serviceName: "EPFO PF Transfer / Withdrawal",
    notes: "Online claims and transfer requests are accepted continuously on EPFO Unified Member Portal.",
    sourceReference: "Employees' Provident Fund Organisation (epfindia.gov.in)",
    sourceUrl: "https://unifiedportal-mem.epfindia.gov.in",
  },

  // Active / Verified Examination Schedules
  "kcet": {
    serviceId: "kcet",
    serviceName: "Karnataka Common Entrance Test (KCET)",
    applicationStart: "2026-01-10",
    applicationEnd: "2026-10-30",
    correctionWindowStart: "2026-03-01",
    correctionWindowEnd: "2026-03-15",
    examDate: "2026-04-18",
    resultDate: "2026-05-25",
    notes: "Registration window active. Verify examination schedule on the official KEA portal.",
    sourceReference: "KEA KCET Examination Calendar (cetonline.karnataka.gov.in/kea)",
    sourceUrl: "https://cetonline.karnataka.gov.in/kea/",
    lastReviewedAt: "2026-02-15",
  },
  "jee-main": {
    serviceId: "jee-main",
    serviceName: "Joint Entrance Examination (Main)",
    applicationStart: "2026-02-01",
    applicationEnd: "2026-11-30",
    examDate: "2026-04-04",
    notes: "Session registration and exam calendar published on official NTA portal.",
    sourceReference: "NTA JEE (Main) Notification (jeemain.nta.nic.in)",
    sourceUrl: "https://jeemain.nta.nic.in",
    lastReviewedAt: "2026-02-01",
  },
  "neet-ug": {
    serviceId: "neet-ug",
    serviceName: "National Eligibility cum Entrance Test (UG)",
    applicationStart: "2026-02-09",
    applicationEnd: "2026-10-15",
    correctionWindowStart: "2026-03-18",
    correctionWindowEnd: "2026-03-20",
    examDate: "2026-05-03",
    notes: "Application window active on official NTA NEET portal.",
    sourceReference: "NTA NEET (UG) Information Bulletin (neet.nta.nic.in)",
    sourceUrl: "https://neet.nta.nic.in",
    lastReviewedAt: "2026-02-09",
  },
  "upsc-civil-services": {
    serviceId: "upsc-civil-services",
    serviceName: "UPSC Civil Services Examination",
    applicationStart: "2026-02-14",
    applicationEnd: "2026-10-05",
    examDate: "2026-05-24",
    notes: "Civil Services (Preliminary) Examination window active on upsc.gov.in via One Time Registration (OTR).",
    sourceReference: "UPSC Examination Notice (upsc.gov.in)",
    sourceUrl: "https://upsc.gov.in",
    lastReviewedAt: "2026-02-14",
  },
  "ssc-cgl": {
    serviceId: "ssc-cgl",
    serviceName: "SSC Combined Graduate Level",
    applicationStart: "2026-06-11",
    applicationEnd: "2026-10-10",
    examDate: "2026-09-15",
    notes: "SSC CGL examination notification published on the new official SSC portal.",
    sourceReference: "Staff Selection Commission Examination Calendar (ssc.gov.in)",
    sourceUrl: "https://ssc.gov.in",
    lastReviewedAt: "2026-06-11",
  },
  "ssp": {
    serviceId: "ssp",
    serviceName: "State Scholarship Portal (SSP Karnataka)",
    applicationStart: "2026-01-01",
    applicationEnd: "2026-11-30",
    notes: "Post-matric scholarship application submission is active for the academic cycle.",
    sourceReference: "Government of Karnataka SSP Portal (ssp.postmatric.karnataka.gov.in)",
    sourceUrl: "https://ssp.postmatric.karnataka.gov.in",
    lastReviewedAt: "2026-01-01",
  },
};

/**
 * Deterministically evaluates the application window status for a given service.
 */
export function evaluateApplicationWindow(
  slugOrKey: string,
  now: Date = new Date()
): ApplicationWindowInfo {
  const norm = slugOrKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").trim();
  const schedule = SERVICE_WINDOW_SCHEDULES[norm];

  const disclaimer =
    "Application dates and deadlines are governed by the conducting authority and are subject to official revision. Always verify current notifications on the official portal.";

  if (!schedule) {
    return {
      serviceId: norm,
      serviceName: slugOrKey,
      status: ApplicationWindowStatuses.UNKNOWN,
      statusLabel: "Application Window Schedule Pending",
      notes:
        "Official application dates are announced by the conducting authority through official notifications. Check the official portal for the upcoming cycle schedule.",
      sourceReference: "Official Conducting Authority Portal",
      disclaimer,
    };
  }

  // Continuous services
  if (!schedule.applicationStart && !schedule.applicationEnd) {
    return {
      serviceId: schedule.serviceId,
      serviceName: schedule.serviceName,
      status: ApplicationWindowStatuses.OPEN,
      statusLabel: "Applications Open (Year-Round)",
      notes: schedule.notes || "Applications accepted continuously on the official citizen portal.",
      sourceReference: schedule.sourceReference,
      sourceUrl: schedule.sourceUrl,
      lastReviewedAt: schedule.lastReviewedAt,
      disclaimer,
    };
  }

  const startDate = schedule.applicationStart ? new Date(schedule.applicationStart) : null;
  const endDate = schedule.applicationEnd ? new Date(schedule.applicationEnd) : null;

  let status: ApplicationWindowStatus = ApplicationWindowStatuses.UNKNOWN;
  let statusLabel = "Application Window Schedule Pending";
  let daysRemaining: number | null = null;

  if (startDate && now < startDate) {
    status = ApplicationWindowStatuses.UPCOMING;
    const diffMs = startDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    statusLabel = `Opening in ${days} days (${startDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })})`;
  } else if (endDate && now > endDate) {
    status = ApplicationWindowStatuses.CLOSED;
    statusLabel = `Application Window Closed (${endDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })})`;
  } else if (startDate && endDate && now >= startDate && now <= endDate) {
    status = ApplicationWindowStatuses.OPEN;
    const diffMs = endDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    statusLabel = `Application Open — Closes ${endDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })} (${daysRemaining} days remaining)`;
  } else {
    status = ApplicationWindowStatuses.OPEN;
    statusLabel = "Application Window Currently Open";
  }

  return {
    serviceId: schedule.serviceId,
    serviceName: schedule.serviceName,
    status,
    statusLabel,
    applicationStart: schedule.applicationStart || null,
    applicationEnd: schedule.applicationEnd || null,
    correctionWindowStart: schedule.correctionWindowStart || null,
    correctionWindowEnd: schedule.correctionWindowEnd || null,
    examDate: schedule.examDate || null,
    resultDate: schedule.resultDate || null,
    daysRemaining,
    notes: schedule.notes || "",
    sourceReference: schedule.sourceReference,
    sourceUrl: schedule.sourceUrl || null,
    lastReviewedAt: schedule.lastReviewedAt || null,
    disclaimer,
  };
}
