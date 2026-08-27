"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconFolder,
  IconIssued,
  IconUpload,
  IconUser,
  IconSettings,
  IconHelp,
  IconLock,
  IconFileText,
  IconSparkles,
} from "@/components/ui/Icons";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/journey/kcet", label: "Application Journey", icon: IconFileText },
  { href: "/documents", label: "My Documents", icon: IconFolder },
  { href: "/issued", label: "Issued", icon: IconIssued },
  { href: "/uploaded", label: "Uploaded", icon: IconUpload },
];

const secondaryNavItems = [
  { href: "/demo", label: "Judge Demo Mode", icon: IconSparkles },
  { href: "/profile", label: "Profile", icon: IconUser },
  { href: "/settings", label: "Settings", icon: IconSettings },
  { href: "/help", label: "Help & FAQ", icon: IconHelp },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 md:flex">
      <div className="flex flex-col gap-6">
        {/* Main Navigation */}
        <div className="flex flex-col gap-1">
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Document Vault
          </span>
          <nav className="mt-1 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${active ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Secondary Navigation */}
        <div className="flex flex-col gap-1">
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Account & Support
          </span>
          <nav className="mt-1 flex flex-col gap-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Privacy Notice Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-2.5">
          <IconLock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Privacy First
            </span>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Document contents are not stored; synthetic metadata is used for demonstration.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
