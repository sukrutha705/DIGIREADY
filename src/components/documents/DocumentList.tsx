"use client";

import React, { useState, useMemo } from "react";
import { DocumentCard } from "./DocumentCard";
import { IconSearch, IconFileText } from "@/components/ui/Icons";
import { formatCategoryName } from "@/lib/formatters";
import type { VaultDocumentDTO } from "@/server/vault";

import { Button } from "@/components/ui/Button";
import { UploadModal } from "@/components/documents/UploadModal";
import { useRouter } from "next/navigation";

interface DocumentListProps {
  initialDocuments: VaultDocumentDTO[];
  initialCategory?: string;
  initialSource?: string;
  title?: string;
  description?: string;
  hideSourceFilter?: boolean;
}

export function DocumentList({
  initialDocuments,
  initialCategory = "ALL",
  initialSource = "ALL",
  title = "Document Vault",
  description = "View, search, and manage your verified digital documents.",
  hideSourceFilter = false,
}: DocumentListProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<VaultDocumentDTO[]>(initialDocuments);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory.toUpperCase());
  const [selectedSource, setSelectedSource] = useState(initialSource.toUpperCase());

  // Collect available unique categories dynamically from the loaded documents
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      if (doc.category) set.add(doc.category);
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [documents]);

  // Filter documents reactively
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Source filter
      if (selectedSource !== "ALL" && doc.source !== selectedSource) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "ALL" && doc.category !== selectedCategory) {
        return false;
      }

      // Search term
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesName = doc.displayName.toLowerCase().includes(query);
        const matchesIssuer = doc.issuer.toLowerCase().includes(query);
        const matchesType = doc.documentTypeName.toLowerCase().includes(query);
        const matchesCat = doc.category.toLowerCase().includes(query);
        return matchesName || matchesIssuer || matchesType || matchesCat;
      }

      return true;
    });
  }, [documents, selectedCategory, selectedSource, search]);

  const handleUploadSuccess = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          router.refresh();
        }}
        onSuccess={handleUploadSuccess}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="text-xs font-semibold gap-1.5 shadow-xs"
          >
            <span>+ Upload Document</span>
          </Button>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg">
            <span className="font-bold text-slate-900 dark:text-white">{filteredDocuments.length}</span> of {documents.length}
          </div>
        </div>
      </div>

      {/* Search & Source Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name, issuer, category..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Source Filter Tabs */}
        {!hideSourceFilter && (
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            {["ALL", "ISSUED", "UPLOADED"].map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSelectedSource(src)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  selectedSource === src
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {src === "ALL" ? "All Sources" : src === "ISSUED" ? "Issued" : "Uploaded"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category Filter Chips */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Category:
          </span>
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {cat === "ALL" ? "All Categories" : formatCategoryName(cat)}
              </button>
            );
          })}
        </div>
      )}

      {/* Document Grid or Empty State */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <IconFileText className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            No documents found
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {search || selectedCategory !== "ALL" || selectedSource !== "ALL"
              ? "Try adjusting your search keywords or filter selections to find your documents."
              : "Your digital document vault is currently empty."}
          </p>
          {(search || selectedCategory !== "ALL" || selectedSource !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedCategory("ALL");
                setSelectedSource("ALL");
              }}
              className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
