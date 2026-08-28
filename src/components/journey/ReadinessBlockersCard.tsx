"use client";

import React from "react";
import type { ReadinessBlocker } from "@/server/journey/types";
import {
  IconAlertCircle as AlertTriangle,
  IconCheckCircle as CheckCircle2,
  IconFileQuestion as FileQuestion,
  IconShield as ShieldAlert,
  IconCalendar as CalendarX,
  IconFileCheck as FileCheck,
  IconArrowRight as ArrowRight,
  IconExternalLink as ExternalLink,
} from "@/components/ui/Icons";
import Link from "next/link";

interface ReadinessBlockersCardProps {
  blockers: ReadinessBlocker[];
  isReady: boolean;
  serviceName: string;
  officialApplicationUrl?: string | null;
  officialWebsite?: string | null;
  onActionClick?: (blocker: ReadinessBlocker) => void;
}

export function ReadinessBlockersCard({
  blockers,
  isReady,
  serviceName,
  officialApplicationUrl,
  officialWebsite,
  onActionClick,
}: ReadinessBlockersCardProps) {
  const portalUrl = officialApplicationUrl || officialWebsite || "https://cetonline.karnataka.gov.in/kea/";

  if (isReady && blockers.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3.5">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
              READY TO APPLY
            </h3>
            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
              All statutory requirements, vault documents, cross-document identity consistency checks, and eligibility criteria are completely verified for <strong>{serviceName}</strong>.
            </p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/80 rounded-lg p-4 border border-emerald-500/20 text-xs text-zinc-700 dark:text-zinc-300 space-y-3">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            Preparation Checklist Complete:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>All required documents present</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Identity records match consistently</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Statutory eligibility conditions met</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Application window active</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow transition-colors"
          >
            <span>Go to Official Application Portal</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 sm:text-right">
            DigiReady has completed its preparation checks.
            <br />
            <strong>Your application has not been submitted.</strong>
          </div>
        </div>
      </div>
    );
  }

  const getBlockerIcon = (category: string) => {
    switch (category) {
      case "DOCUMENT_MISSING":
        return <FileQuestion className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
      case "CONFLICT":
        return <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />;
      case "DEADLINE":
        return <CalendarX className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />;
      case "VERIFICATION":
        return <FileCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;
      case "ELIGIBILITY":
      default:
        return <AlertTriangle className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
            Readiness Blockers
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            You are not ready to apply yet. {blockers.length} {blockers.length === 1 ? "item needs" : "items need"} attention:
          </p>
        </div>
      </div>

      {/* Blockers List */}
      <div className="space-y-3">
        {blockers.map((blocker, index) => (
          <div
            key={blocker.id || index}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800/70"
          >
            <div className="flex items-start gap-3">
              {getBlockerIcon(blocker.category)}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {index + 1}. {blocker.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  {blocker.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 sm:self-center pt-1 sm:pt-0">
              {blocker.actionHref && blocker.actionHref.startsWith("/") ? (
                <Link
                  href={blocker.actionHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 shadow-sm transition-colors"
                >
                  <span>{blocker.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ) : blocker.actionHref ? (
                <a
                  href={blocker.actionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 shadow-sm transition-colors"
                >
                  <span>{blocker.actionLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button
                  onClick={() => onActionClick?.(blocker)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 shadow-sm transition-colors"
                >
                  <span>{blocker.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
