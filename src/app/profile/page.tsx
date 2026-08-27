import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/formatters";
import { IconUser, IconLock, IconFolder, IconIssued, IconUpload, IconCheckCircle } from "@/components/ui/Icons";
import { getDemoUser, getUserVaultSummary } from "@/server/vault";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const demoUser = await getDemoUser();
  const summary = await getUserVaultSummary(demoUser.id);

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Citizen Profile
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Synthetic account details for testing and demonstration workflows.
          </p>
        </div>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                <IconUser className="h-7 w-7" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="purple" size="sm">
                    Demo Account
                  </Badge>
                  <Badge variant="success" size="sm">
                    Active
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {demoUser.displayName}
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Account ID: {demoUser.id.slice(0, 13)}••••••
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Session Type
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                Synthetic Demonstration
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Created On
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                {formatDate(demoUser.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Vault Status
              </span>
              <span className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-1">
                <IconCheckCircle className="w-3.5 h-3.5" />
                Synchronized
              </span>
            </div>
          </div>
        </Card>

        {/* Vault Statistics Card */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Document Vault Summary
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40 text-center">
              <span className="text-2xl font-bold text-slate-900 dark:text-white block">
                {summary.totalDocuments}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Total Documents
              </span>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30 text-center">
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 block">
                {summary.issuedCount}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">
                Issued Records
              </span>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30 text-center">
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-300 block">
                {summary.uploadedCount}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 block">
                Uploaded Records
              </span>
            </div>
          </div>
        </Card>

        {/* Prototype Disclaimer */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-start gap-3">
          <IconLock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            This is a synthetic prototype session created for the 30-hour DigiReady hackathon demonstration. No personal identification numbers, passwords, OTPs, or biometric data are stored or accessed.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
