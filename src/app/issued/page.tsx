import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentList } from "@/components/documents/DocumentList";
import { getDemoUser, getUserDocuments } from "@/server/vault";

export const dynamic = "force-dynamic";

export default async function IssuedDocumentsPage() {
  const demoUser = await getDemoUser();
  const issuedDocuments = await getUserDocuments(demoUser.id, { source: "ISSUED" });

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <DocumentList
        initialDocuments={issuedDocuments}
        initialSource="ISSUED"
        hideSourceFilter={true}
        title="Issued Documents"
        description="Official documents issued directly by authorized demonstration authorities."
      />
    </AppShell>
  );
}
