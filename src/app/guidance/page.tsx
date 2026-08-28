import React from "react";
import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { getDemoUser } from "@/server/vault";
import { getGuidanceHubData } from "@/server/guidance/service";
import { GuidanceHubView } from "@/components/guidance/GuidanceHubView";

export const metadata: Metadata = {
  title: "Guidance Center | DigiReady",
  description:
    "Official help, authority correction pathways, missing document guides, and verified physical facility locations for Indian citizen applications.",
};

export const dynamic = "force-dynamic";

export default async function GuidancePage() {
  const demoUser = await getDemoUser();
  const summary = await getGuidanceHubData(demoUser.id, "Bengaluru");

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <GuidanceHubView summary={summary} />
    </AppShell>
  );
}
