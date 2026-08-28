"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  IconSearch,
  IconAlertCircle,
  IconShieldCheck,
  IconBuilding,
  IconMapPin,
  IconChevronRight,
  IconFileText,
  IconExternalLink,
} from "@/components/ui/Icons";
import type { GuidanceHubSummary } from "@/server/guidance/service";

interface GuidanceHubViewProps {
  summary: GuidanceHubSummary;
}

export function GuidanceHubView({ summary }: GuidanceHubViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [quickCity, setQuickCity] = useState("Bengaluru");
  const [quickAuth, setQuickAuth] = useState("UIDAI");
  const [quickCentres, setQuickCentres] = useState<any | null>(null);
  const [isSearchingCentres, setIsSearchingCentres] = useState(false);

  const handleQuickCentreSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCity.trim()) return;
    setIsSearchingCentres(true);
    try {
      const res = await fetch(
        `/api/centres?authority=${encodeURIComponent(quickAuth)}&city=${encodeURIComponent(
          quickCity.trim()
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setQuickCentres(data);
      }
    } catch {
      // safe error
    } finally {
      setIsSearchingCentres(false);
    }
  };

  const filteredConflicts = summary.conflictGuides.filter((g) => {
    if (selectedCategory !== "ALL" && selectedCategory !== "CONFLICTS") return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.authorityName.toLowerCase().includes(q)
    );
  });

  const filteredDocs = summary.missingDocumentGuides.filter((d) => {
    if (selectedCategory !== "ALL" && selectedCategory !== "DOCS") return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.authorityName.toLowerCase().includes(q)
    );
  });

  const filteredAuthorities = summary.authorities.filter((a) => {
    if (selectedCategory !== "ALL" && selectedCategory !== "AUTHORITIES") return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.shortName.toLowerCase().includes(q) ||
      a.jurisdiction.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Official Help &amp; Correction Pathways
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          DigiReady Guidance Center
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Understand document issues, follow official issuing authority correction procedures, locate verified facilities, and recheck your readiness.
        </p>

        {/* Standard Disclaimer Banner */}
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-start gap-2.5">
          <IconShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            DigiReady helps citizens prepare for applications by checking available requirements, documents, eligibility information, and consistency. It does not submit applications or guarantee government approval. Always verify current requirements and deadlines with the relevant official authority.
          </span>
        </div>
      </div>

      {/* ACTIVE CITIZEN ISSUES SECTION (If present in vault) */}
      {summary.activeIssues.length > 0 && (
        <Card className="p-6 border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 border-b border-rose-100 dark:border-rose-900/40 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <IconAlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Active Issues Requiring Attention ({summary.activeIssues.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  DigiReady detected document discrepancies that currently block application readiness.
                </p>
              </div>
            </div>
            <Badge variant="warning" size="sm">
              Blocking
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {summary.activeIssues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {issue.fieldLabel} Discrepancy
                    </span>
                    <Badge variant="warning" size="sm">
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    {issue.explanation}
                  </p>
                  <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <span className="font-semibold">{issue.documentA.documentDisplayName}:</span> &ldquo;{issue.valueA}&rdquo; vs <span className="font-semibold">{issue.documentB.documentDisplayName}:</span> &ldquo;{issue.valueB}&rdquo;
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Authority: {issue.authority.shortName}
                  </span>
                  <Link href={`/guidance/${issue.field === "name" ? "name-mismatch" : issue.field === "dateOfBirth" ? "dob-mismatch" : issue.field === "parentName" ? "parent-name-mismatch" : issue.field === "address" ? "address-mismatch" : "gender-mismatch"}`}>
                    <Button variant="primary" size="sm" className="text-xs font-semibold gap-1">
                      <span>Resolve Issue</span>
                      <IconChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SEARCH AND CATEGORY FILTER */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guidance topics, document types, or statutory authorities..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All Topics" },
            { id: "CONFLICTS", label: "Identity Conflicts" },
            { id: "DOCS", label: "Missing Documents" },
            { id: "AUTHORITIES", label: "Authorities" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. IDENTITY CONFLICT RESOLUTION GUIDES */}
      {filteredConflicts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Identity Conflict Resolution Guides
              </h2>
              <p className="text-xs text-slate-500">
                Official pathways for correcting discrepancies across names, dates of birth, parent details, and addresses.
              </p>
            </div>
            <Badge variant="outline" size="sm">
              {filteredConflicts.length} Guides
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredConflicts.map((item) => (
              <Link
                key={item.slug}
                href={`/guidance/${item.slug}`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="warning" size="sm">
                      {item.severity}
                    </Badge>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {item.authorityName}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-semibold text-blue-600 dark:border-slate-800 dark:text-blue-400">
                  <span>View Official Steps</span>
                  <IconChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 2. MISSING DOCUMENT OBTAINMENT GUIDES */}
      {filteredDocs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Missing Document Guidance
              </h2>
              <p className="text-xs text-slate-500">
                Official instructions for applying, verifying, or re-issuing mandatory certificates and proofs.
              </p>
            </div>
            <Badge variant="outline" size="sm">
              {filteredDocs.length} Documents
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {filteredDocs.map((item) => (
              <Link
                key={item.slug}
                href={`/guidance/${item.slug}`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {item.category}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-blue-600 dark:border-slate-800 dark:text-blue-400">
                  <span>How to obtain</span>
                  <IconChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. STATUTORY AUTHORITIES DIRECTORY */}
      {filteredAuthorities.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Statutory Issuing Authorities Directory
              </h2>
              <p className="text-xs text-slate-500">
                Official government portals, jurisdiction boundaries, and designated citizen correction channels.
              </p>
            </div>
            <Badge variant="outline" size="sm">
              {filteredAuthorities.length} Authorities
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAuthorities.map((auth) => (
              <div
                key={auth.id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {auth.shortName}
                    </span>
                    <span className="text-[10px] text-slate-400">{auth.jurisdiction}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {auth.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-3">
                    {auth.officialProcessNote}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/guidance/${auth.id.toLowerCase().replace(/_/g, "-")}`}
                    className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View Correction Steps →
                  </Link>
                  {auth.officialUrl && (
                    <a
                      href={auth.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <IconExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. QUICK CITY CORRECTION CENTRE LOOKUP CARD */}
      <Card className="p-6 border-blue-100 bg-blue-50/30 dark:border-blue-900/40 dark:bg-slate-900">
        <div className="border-b border-blue-100 dark:border-blue-900/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <IconMapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Quick Official Correction Centre Finder
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Check authorized physical facilities in your city. DigiReady only collects your city name.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleQuickCentreSearch} className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <select
            value={quickAuth}
            onChange={(e) => setQuickAuth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium"
          >
            <option value="UIDAI">Aadhaar (UIDAI)</option>
            <option value="PASSPORT_SEVA">Passport Seva (PSK / POPSK)</option>
            <option value="REVENUE_DEPARTMENT">Revenue / Nadakacheri</option>
            <option value="TRANSPORT_DEPARTMENT">RTO / Parivahan</option>
            <option value="INCOME_TAX_DEPARTMENT">PAN (Protean TIN-FC)</option>
          </select>

          <input
            type="text"
            value={quickCity}
            onChange={(e) => setQuickCity(e.target.value)}
            placeholder="Enter city (e.g. Bengaluru, Mysuru, Delhi)"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSearchingCentres}
            className="text-xs font-semibold gap-1.5 shrink-0"
          >
            <IconSearch className="w-3.5 h-3.5" />
            <span>{isSearchingCentres ? "Searching..." : "Find Centres"}</span>
          </Button>
        </form>

        {quickCentres && (
          <div className="mt-3">
            {quickCentres.isVerifiedAvailable && quickCentres.verifiedCentres.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Verified official facilities in {quickCentres.normalizedCity}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {quickCentres.verifiedCentres.map((c: any) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between gap-1.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                          <Badge variant="success" size="sm" className="text-[10px]">Verified</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.address}</p>
                      </div>
                      {c.appointmentUrl && (
                        <a
                          href={c.appointmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1 self-start"
                        >
                          <span>Official Appointment Link</span>
                          <IconExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs dark:border-amber-900/60 dark:bg-slate-950 flex items-center justify-between gap-2">
                <span className="text-amber-800 dark:text-amber-300">
                  {quickCentres.safeFallbackMessage || "No verified centres listed for this city."}
                </span>
                <a
                  href={quickCentres.officialLocatorUrl || "https://appointments.uidai.gov.in"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shrink-0"
                >
                  Open Official Locator
                </a>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
