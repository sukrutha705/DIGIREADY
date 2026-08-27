import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  IconHelp,
  IconLock,
  IconCheckCircle,
  IconFolder,
  IconSparkles,
} from "@/components/ui/Icons";
import { getDemoUser } from "@/server/vault";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const demoUser = await getDemoUser();

  const faqItems = [
    {
      question: "What is DigiReady?",
      answer:
        "DigiReady is a citizen-assistance concept prototype inspired by the document-wallet model of Indian public digital services. It checks whether your documents meet the requirements of competitive exams or government applications before you apply.",
    },
    {
      question: "Is DigiReady the official DigiLocker application?",
      answer:
        "No. DigiReady is an independent research and hackathon concept prototype. It does not claim official government affiliation, does not scrape government websites, and does not access live government databases.",
    },
    {
      question: "What is the difference between Issued and Uploaded documents?",
      answer:
        "Issued documents are officially verified records issued directly by educational boards or statutory authorities. Uploaded documents represent institutional study certificates, self-attested certificates, or domicile proofs added by the citizen.",
    },
    {
      question: "How does DigiReady protect my privacy?",
      answer:
        "DigiReady is built with strict privacy-preserving principles: document binaries, PDFs, images, and raw scans are never persistently stored. Verification and analysis happen in-memory ephemerally, and all demonstration data is strictly synthetic.",
    },
    {
      question: "What kind of checks does the DigiReady engine perform?",
      answer:
        "DigiReady checks requirement completeness (e.g. required 10th/12th marks cards, identity proofs), metadata consistency (matching name spellings, date of birth, father/mother name across documents), and validity/expiration dates.",
    },
  ];

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Help & Knowledge Center
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Frequently asked questions, document wallet guidance, and privacy explanations.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="p-4.5 flex flex-col gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              <IconFolder className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Document Wallet
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Store, organize, and browse your verified academic, identity, and social certificates.
            </p>
          </Card>

          <Card className="p-4.5 flex flex-col gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <IconCheckCircle className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Consistency Checks
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Detects conflicting name order, differing dates of birth, or expired documents.
            </p>
          </Card>

          <Card className="p-4.5 flex flex-col gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
              <IconSparkles className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Application Readiness
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Answers what documents are required for exams like KCET, scholarships, or certificates.
            </p>
          </Card>
        </div>

        {/* FAQs */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>

          <div className="flex flex-col gap-3">
            {faqItems.map((item) => (
              <Card key={item.question} className="p-4.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.question}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Synthetic Prototype Notice */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-start gap-3">
          <IconLock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            DigiReady is demonstrated using synthetic sample records for academic and competition purposes only.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
