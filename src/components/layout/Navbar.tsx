"use client";

import React from "react";
import Link from "next/link";
import { IconSparkles, IconUser, IconLock } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";

interface NavbarProps {
  userDisplayName?: string;
}

export function Navbar({ userDisplayName = "Demo Citizen (KCET Applicant)" }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 lg:px-8">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-transform group-hover:scale-105">
            <IconSparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Digi<span className="text-blue-600 dark:text-blue-400">Ready</span>
            </span>
            <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Document Wallet & Readiness
            </span>
          </div>
        </Link>

        {/* Prototype disclaimer badge */}
        <div className="hidden md:flex items-center ml-2">
          <Badge variant="outline" size="sm" className="gap-1.5 py-0.5 text-[11px] text-slate-500 border-slate-300">
            <IconLock className="w-3 h-3 text-slate-400" />
            Synthetic Prototype
          </Badge>
        </div>
      </div>

      {/* Right User Status */}
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2 pr-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
            <IconUser className="h-3.5 w-3.5" />
          </div>
          <span className="max-w-[130px] truncate sm:max-w-[180px]">
            {userDisplayName}
          </span>
        </Link>
      </div>
    </header>
  );
}
