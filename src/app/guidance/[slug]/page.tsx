import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getDemoUser } from "@/server/vault";
import { getGuidanceTopicBySlug } from "@/server/guidance/service";
import { GuidanceTopicView } from "@/components/guidance/GuidanceTopicView";

interface GuidanceTopicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: GuidanceTopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || "");
  const topic = await getGuidanceTopicBySlug(decodedSlug);

  if (!topic) {
    return {
      title: "Guidance Topic Not Found | DigiReady",
    };
  }

  return {
    title: `${topic.title} | DigiReady Guidance`,
    description: topic.subtitle || topic.explanation,
  };
}

export const dynamic = "force-dynamic";

export default async function GuidanceTopicPage({ params }: GuidanceTopicPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || "");
  const demoUser = await getDemoUser();
  const topic = await getGuidanceTopicBySlug(decodedSlug, demoUser.id, "Bengaluru");

  if (!topic) {
    notFound();
  }

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <GuidanceTopicView topic={topic} />
    </AppShell>
  );
}
