import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentList } from "@/components/documents/DocumentList";
import { getDemoUser, getUserDocuments } from "@/server/vault";

export const dynamic = "force-dynamic";

export default async function UploadedDocumentsPage() {
  const demoUser = await getDemoUser();
  const uploadedDocuments = await getUserDocuments(demoUser.id, { source: "UPLOADED" });

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <DocumentList
        initialDocuments={uploadedDocuments}
        initialSource="UPLOADED"
        hideSourceFilter={true}
        title="Uploaded Documents"
        description="Supporting documents, study certificates, and institutional records uploaded to your vault."
      />
    </AppShell>
  );
}
