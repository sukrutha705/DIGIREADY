"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconFolder,
  IconShield,
  IconHelp,
  IconSparkles,
} from "@/components/ui/Icons";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/services", label: "Services", icon: IconShield },
  { href: "/guidance", label: "Guidance", icon: IconHelp },
  { href: "/documents", label: "Vault", icon: IconFolder },
  { href: "/demo", label: "Demo", icon: IconSparkles },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 transition-colors ${
              active
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
