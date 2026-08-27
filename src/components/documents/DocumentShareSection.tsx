"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconShare, IconLock } from "@/components/ui/Icons";
import { DocumentShareModal } from "@/components/sharing/DocumentShareModal";
import { ActiveSharesList } from "@/components/sharing/ActiveSharesList";

interface DocumentShareSectionProps {
  documentId: string;
  documentDisplayName: string;
}

export function DocumentShareHeaderAction({
  documentId,
  documentDisplayName,
}: DocumentShareSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="gap-2 shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
      >
        <IconShare className="w-4 h-4" />
        <span>Share Credential</span>
      </Button>

      <DocumentShareModal
        documentId={documentId}
        documentDisplayName={documentDisplayName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onShareCreated={() => {
          // Trigger local refresh if needed
          window.location.reload();
        }}
      />
    </>
  );
}

export function DocumentShareHistoryCard({
  documentId,
  documentDisplayName,
}: DocumentShareSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <IconShare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Sharing & Consent History</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active and past controlled metadata sharing permissions granted for this document.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 self-start sm:self-auto text-xs"
        >
          <IconShare className="w-3.5 h-3.5" />
          <span>New Share Grant</span>
        </Button>
      </div>

      <ActiveSharesList documentId={documentId} refreshTrigger={refreshTrigger} />

      <DocumentShareModal
        documentId={documentId}
        documentDisplayName={documentDisplayName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onShareCreated={() => {
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    </Card>
  );
}
