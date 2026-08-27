"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconAlertCircle } from "@/components/ui/Icons";
import type { DocumentShareRecord } from "@/server/sharing/types";

interface ActiveSharesListProps {
  documentId?: string;
  refreshTrigger?: number;
}

export function ActiveSharesList({ documentId, refreshTrigger }: ActiveSharesListProps) {
  const [shares, setShares] = useState<DocumentShareRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchShares = async () => {
    try {
      const url = documentId ? `/api/shares?documentId=${documentId}` : "/api/shares";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares || []);
      }
    } catch (err) {
      console.error("Failed to load shares:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, [documentId, refreshTrigger]);

  const handleRevoke = async (shareId: string) => {
    if (revokingId) return;
    setRevokingId(shareId);
    setError(null);

    try {
      const res = await fetch(`/api/shares/${shareId}/revoke`, {
        method: "POST",
      });

      if (res.ok) {
        const updated: DocumentShareRecord = await res.json();
        setShares((prev) =>
          prev.map((s) => (s.id === shareId ? { ...s, status: updated.status, revokedAt: updated.revokedAt } : s))
        );
      } else {
        setError("Failed to revoke share permission.");
      }
    } catch (err) {
      setError("Network error during share revocation.");
    } finally {
      setRevokingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success" size="sm">Active</Badge>;
      case "EXPIRED":
        return <Badge variant="default" size="sm">Expired</Badge>;
      case "REVOKED":
        return <Badge variant="warning" size="sm">Revoked</Badge>;
      default:
        return <Badge variant="info" size="sm">{status}</Badge>;
    }
  };

  const maskShareRef = (token: string) => {
    if (!token) return "SHR-••••••••";
    return `SHR-${token.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-slate-500">
        Loading sharing records...
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="py-4 text-xs text-slate-500 italic">
        No sharing permissions have been created for this document yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <IconAlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
        {shares.map((share) => {
          const isActive = share.status === "ACTIVE";
          const formattedExpiry = new Date(share.expiresAt).toLocaleDateString();

          return (
            <div
              key={share.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 text-xs"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {share.recipientName}
                  </span>
                  {getStatusBadge(share.status)}
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] truncate">
                  Purpose: <span className="font-medium text-slate-700 dark:text-slate-300">{share.purpose}</span>
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>Ref: <span className="font-mono">{maskShareRef(share.shareToken)}</span></span>
                  <span>•</span>
                  <span>{isActive ? `Expires ${formattedExpiry}` : `Ended ${formattedExpiry}`}</span>
                </div>
              </div>

              {isActive && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revokingId === share.id}
                    onClick={() => handleRevoke(share.id)}
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {revokingId === share.id ? "Revoking..." : "Revoke Access"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
