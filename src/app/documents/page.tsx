import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentList } from "@/components/documents/DocumentList";
import { getDemoUser, getUserDocuments } from "@/server/vault";

export const dynamic = "force-dynamic";

interface DocumentsPageProps {
  searchParams: Promise<{
    category?: string;
    source?: string;
    search?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = await searchParams;
  const demoUser = await getDemoUser();
  const initialDocuments = await getUserDocuments(demoUser.id);

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <DocumentList
        initialDocuments={initialDocuments}
        initialCategory={params.category || "ALL"}
        initialSource={params.source || "ALL"}
        title="My Documents"
        description="Browse, search, and verify documents available in your digital vault."
      />
    </AppShell>
  );
}
