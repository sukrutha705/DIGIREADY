"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { UploadModal } from "@/components/documents/UploadModal";
import { useRouter } from "next/navigation";

export function DemoResetButton() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleReset = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/demo/reset", {
        method: "POST",
      });

      if (res.ok) {
        setResetMessage("Reset complete!");
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setResetMessage("Reset failed");
      }
    } catch (err) {
      console.error("Reset error:", err);
      setResetMessage("Reset error");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isResetting}
        onClick={handleReset}
        className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {isResetting ? "Resetting Demo State..." : "Reset Demo State"}
      </Button>
      {resetMessage && (
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          {resetMessage}
        </span>
      )}
    </div>
  );
}

export function DemoUploadAction() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <>
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          router.refresh();
        }}
        preselectedDocumentType="INCOME_CERTIFICATE"
        preselectedDocumentName="Income Certificate"
        onSuccess={() => router.refresh()}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsUploadModalOpen(true)}
        className="text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
      >
        + Upload Missing Doc
      </Button>
    </>
  );
}
