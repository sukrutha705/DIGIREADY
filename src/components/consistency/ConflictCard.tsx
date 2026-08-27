"use client";

import React from "react";
import { ConflictResolutionCard } from "@/components/conflicts/ConflictResolutionCard";
import type { ConsistencyAssessment } from "@/server/consistency/types";

interface ConflictCardProps {
  consistency: ConsistencyAssessment;
  onUploadSuccess?: () => void;
}

export function ConflictCard({ consistency, onUploadSuccess }: ConflictCardProps) {
  return (
    <ConflictResolutionCard
      consistency={consistency}
      onUploadSuccess={onUploadSuccess}
    />
  );
}
