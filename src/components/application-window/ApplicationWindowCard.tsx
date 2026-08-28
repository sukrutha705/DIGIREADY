"use client";

import React from "react";
import type { ApplicationWindowInfo } from "@/server/application-window/types";
import {
  IconCalendar as Calendar,
  IconClock as Clock,
  IconExternalLink as ExternalLink,
  IconHelp as Info,
  IconCheckCircle as CheckCircle2,
  IconAlertCircle as AlertCircle,
} from "@/components/ui/Icons";

interface ApplicationWindowCardProps {
  windowInfo: ApplicationWindowInfo;
}

export function ApplicationWindowCard({ windowInfo }: ApplicationWindowCardProps) {
  const getStatusBadge = () => {
    switch (windowInfo.status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Application Open
          </span>
        );
      case "UPCOMING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            Upcoming Cycle
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Window Closed
          </span>
        );
      case "UNKNOWN":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
            <Info className="w-3.5 h-3.5" />
            Schedule Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
              Application Window & Timeline
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Official registration dates and conducting schedule
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Main Status Text */}
      <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
        {windowInfo.statusLabel}
      </div>

      {/* Timeline Dates Grid if dates available */}
      {(windowInfo.applicationStart || windowInfo.applicationEnd || windowInfo.examDate) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-lg text-xs">
          {windowInfo.applicationStart && (
            <div>
              <div className="text-zinc-400 font-medium">Registration Start</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {new Date(windowInfo.applicationStart).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          )}

          {windowInfo.applicationEnd && (
            <div>
              <div className="text-zinc-400 font-medium">Registration Deadline</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {new Date(windowInfo.applicationEnd).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          )}

          {windowInfo.examDate && (
            <div>
              <div className="text-zinc-400 font-medium">Examination Date</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {new Date(windowInfo.examDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {windowInfo.notes && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {windowInfo.notes}
        </p>
      )}

      {/* Footer */}
      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Source: {windowInfo.sourceReference}</span>
        </div>

        {windowInfo.sourceUrl && (
          <a
            href={windowInfo.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Visit official portal
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
