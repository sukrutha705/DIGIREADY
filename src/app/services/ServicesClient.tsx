"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ServiceDTO } from "@/types/service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconSearch,
  IconShield,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconArrowRight,
  IconExternalLink,
  IconPlus,
  IconSparkles,
  IconFileText,
} from "@/components/ui/Icons";

interface ServicesClientProps {
  initialServices: ServiceDTO[];
  initialActiveSlugs: string[];
  userId: string;
}

const CATEGORIES = [
  { id: "ALL", label: "All Services" },
  { id: "EXAMINATION", label: "Entrance Exams" },
  { id: "RECRUITMENT", label: "Govt Recruitment" },
  { id: "SCHOLARSHIP", label: "Scholarships" },
  { id: "GOVERNMENT_SCHEME", label: "Govt Schemes" },
  { id: "CERTIFICATE", label: "Certificates" },
  { id: "GOVERNMENT_SERVICE", label: "Citizen Services" },
  { id: "EMPLOYMENT", label: "Employment & Pension" },
];

export function ServicesClient({
  initialServices,
  initialActiveSlugs,
  userId,
}: ServicesClientProps) {
  const [services] = useState<ServiceDTO[]>(initialServices);
  const [activeSlugs, setActiveSlugs] = useState<Set<string>>(
    new Set(initialActiveSlugs)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      // Category filter
      if (selectedCategory !== "ALL" && svc.category !== selectedCategory) {
        return false;
      }

      // Jurisdiction filter
      if (selectedJurisdiction !== "ALL") {
        const jur = (svc.jurisdiction || "").toLowerCase();
        if (selectedJurisdiction === "NATIONAL" && !jur.includes("national")) {
          return false;
        }
        if (selectedJurisdiction === "STATE" && !jur.includes("karnataka") && !jur.includes("state")) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== "ALL" && svc.availabilityStatus !== selectedStatus) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) {
        return true;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchName = svc.name.toLowerCase().includes(q);
      const matchShort = svc.shortName?.toLowerCase().includes(q);
      const matchSlug = svc.slug.toLowerCase().includes(q);
      const matchDesc = svc.shortDescription?.toLowerCase().includes(q);
      const matchAuth = svc.authority?.toLowerCase().includes(q);
      const matchElig = svc.eligibilitySummary?.toLowerCase().includes(q);
      const matchReq = svc.requirements?.some(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.documentTypeName.toLowerCase().includes(q)
      );

      return (
        matchName ||
        matchShort ||
        matchSlug ||
        matchDesc ||
        matchAuth ||
        matchElig ||
        matchReq
      );
    });
  }, [services, selectedCategory, selectedJurisdiction, selectedStatus, searchQuery]);

  const handleTogglePreparation = async (service: ServiceDTO) => {
    setTogglingSlug(service.slug);
    setActionMessage(null);
    const isCurrentlyActive = activeSlugs.has(service.slug);

    try {
      if (isCurrentlyActive) {
        // Remove from active
        const res = await fetch(`/api/services/active/${service.slug}?userId=${userId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const next = new Set(activeSlugs);
          next.delete(service.slug);
          setActiveSlugs(next);
          setActionMessage(`Removed "${service.name}" from your active preparations.`);
        }
      } else {
        // Add to active
        const res = await fetch("/api/services/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: service.slug, userId }),
        });
        if (res.ok) {
          const next = new Set(activeSlugs);
          next.add(service.slug);
          setActiveSlugs(next);
          setActionMessage(`Added "${service.name}" to your active preparations on Dashboard.`);
        }
      }
    } catch (err) {
      console.error("Failed to toggle preparation status:", err);
    } finally {
      setTogglingSlug(null);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: services.length };
    for (const svc of services) {
      counts[svc.category] = (counts[svc.category] || 0) + 1;
    }
    return counts;
  }, [services]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                <IconSparkles className="w-3.5 h-3.5" />
                Verified India Service Registry
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {services.length} Registered Services & Exams
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explore Examinations & Public Services
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Know what you need. Check what you have. Detect conflicts. Fix issues. Know when you are ready to apply.
            </p>
          </div>

          <Link href="/dashboard">
            <Button variant="outline" className="gap-2 text-xs">
              <IconShield className="w-4 h-4 text-blue-600" />
              View My Preparations ({activeSlugs.size})
            </Button>
          </Link>
        </div>

        {/* Prototype Transparency Notice */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div className="flex items-start gap-2.5">
            <IconAlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>Application Readiness & Preparation Platform:</strong> DigiReady helps citizens verify document completeness and detect identity mismatches before applying. Requirement rules are structured reference specifications based on published official bulletins. Always consult the official authority portal for statutory submission.
            </div>
          </div>
        </div>

        {actionMessage && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-semibold text-emerald-700 underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Controls: Search & Category Tabs */}
      <div className="space-y-3">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs dark:bg-blue-600 dark:text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label} {count > 0 && <span className="opacity-70 ml-1">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Search Bar + Secondary Dropdown Filters */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Jurisdiction filter */}
            <select
              value={selectedJurisdiction}
              onChange={(e) => setSelectedJurisdiction(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Jurisdictions</option>
              <option value="NATIONAL">National Level</option>
              <option value="STATE">State Level (Karnataka / State)</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUPPORTED">Supported</option>
              <option value="COMING_SOON">Coming Soon</option>
            </select>

            {(selectedCategory !== "ALL" || selectedJurisdiction !== "ALL" || selectedStatus !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSelectedJurisdiction("ALL");
                  setSelectedStatus("ALL");
                  setSearchQuery("");
                }}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px] sm:w-80">
            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, exam, authority, document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <IconSearch className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
            No matching services found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search terms or category filter to view other public services.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory("ALL");
              setSelectedJurisdiction("ALL");
              setSelectedStatus("ALL");
              setSearchQuery("");
            }}
            className="mt-4 text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => {
            const isSaved = activeSlugs.has(service.slug);
            const isComingSoon = service.availabilityStatus === "COMING_SOON";
            const isNotSupported = service.availabilityStatus === "NOT_CURRENTLY_SUPPORTED";

            return (
              <div
                key={service.id || service.slug}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs transition-all hover:shadow-md dark:bg-slate-900 ${
                  isSaved
                    ? "border-blue-300 ring-1 ring-blue-500/20 dark:border-blue-800"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  {/* Category & Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {service.category.replace(/_/g, " ")}
                    </span>
                    {isComingSoon ? (
                      <Badge variant="warning" size="sm" className="text-[10px] gap-1">
                        <IconClock className="w-3 h-3" /> Coming Soon
                      </Badge>
                    ) : isNotSupported ? (
                      <Badge variant="outline" size="sm" className="text-[10px] text-slate-400">
                        Not Supported
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm" className="text-[10px] gap-1">
                        <IconShield className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>

                  {/* Service Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                        {service.name}
                      </h2>
                      {service.shortName && service.shortName !== service.name && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {service.shortName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Authority / Jurisdiction */}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {service.authority || "Government Authority"}
                    {service.jurisdiction ? ` • ${service.jurisdiction}` : ""}
                  </p>

                  {/* Description */}
                  <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {service.shortDescription || service.description || "Public examination or service."}
                  </p>

                  {/* Eligibility Snippet if available */}
                  {service.eligibilitySummary && (
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-md p-2 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Eligibility: </span>
                      {service.eligibilitySummary}
                    </div>
                  )}

                  {/* Requirements Summary */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <IconFileText className="w-3.5 h-3.5 text-slate-400" />
                        Required Documents
                      </span>
                      <span className="text-slate-500 font-medium">
                        {service.requiredDocumentsCount} mandatory
                      </span>
                    </div>

                    {/* Requirements Chips */}
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                      {service.requirements && service.requirements.length > 0 ? (
                        service.requirements.slice(0, 3).map((req) => (
                          <span
                            key={req.id || req.requirementKey}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              req.required
                                ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                : "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {req.label || req.documentTypeName}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {isComingSoon || isNotSupported
                            ? "Requirements preview unavailable"
                            : "No document requirements specified"}
                        </span>
                      )}
                      {service.requirements && service.requirements.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{service.requirements.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Readiness / Details Link */}
                  {isComingSoon || isNotSupported ? (
                    <span className="text-xs text-slate-400 italic">
                      Catalog Reference
                    </span>
                  ) : (
                    <Link
                      href={`/journey/${service.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Check Readiness
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {/* Right Actions: Add to Dashboard / Official Portal */}
                  <div className="flex items-center gap-2">
                    {service.officialWebsite && (
                      <a
                        href={service.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={`Visit Official Portal (${service.officialWebsite})`}
                      >
                        <IconExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {!isComingSoon && !isNotSupported && (
                      <Button
                        size="sm"
                        variant={isSaved ? "outline" : "secondary"}
                        disabled={togglingSlug === service.slug}
                        onClick={() => handleTogglePreparation(service)}
                        className="text-xs gap-1 py-1 px-2.5 h-8"
                      >
                        {isSaved ? (
                          <>
                            <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Active</span>
                          </>
                        ) : (
                          <>
                            <IconPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Add</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
