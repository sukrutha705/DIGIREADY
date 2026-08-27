import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { CategoryGrid } from "@/components/dashboard/CategoryGrid";
import { RecentDocuments } from "@/components/dashboard/RecentDocuments";
import { AttentionBanner } from "@/components/dashboard/AttentionBanner";
import { getDemoUser, getUserVaultSummary } from "@/server/vault";
import { getApplicationJourney } from "@/server/journey/service";
import { DashboardJourneyCard } from "@/components/dashboard/DashboardJourneyCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const demoUser = await getDemoUser();
  const summary = await getUserVaultSummary(demoUser.id);
  const activeJourney = await getApplicationJourney(demoUser.id, "KCET");

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <div className="flex flex-col gap-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Citizen Document Wallet
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Welcome, {demoUser.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Your digital documents are organized, verified, and ready in your vault.
          </p>
        </div>

        {/* Primary Application Readiness & Journey Section */}
        <DashboardJourneyCard journey={activeJourney} />

        {/* Attention & Status Banner */}
        <AttentionBanner
          totalCount={summary.totalDocuments}
          issuedCount={summary.issuedCount}
          uploadedCount={summary.uploadedCount}
        />

        {/* Overview Metric Cards */}
        <OverviewCards
          totalCount={summary.totalDocuments}
          issuedCount={summary.issuedCount}
          uploadedCount={summary.uploadedCount}
          categoriesCount={summary.categoriesCount}
        />

        {/* Document Categories Breakdown */}
        <CategoryGrid categories={summary.categories} />

        {/* Recent Documents Preview */}
        <RecentDocuments documents={summary.recentDocuments} />
      </div>
    </AppShell>
  );
}
