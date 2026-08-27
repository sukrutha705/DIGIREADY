import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { FloatingAssistant } from "@/components/assistant/FloatingAssistant";

interface AppShellProps {
  children: React.ReactNode;
  userDisplayName?: string;
}

export function AppShell({ children, userDisplayName }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans antialiased">
      {/* Top Navbar */}
      <Navbar userDisplayName={userDisplayName} />

      {/* Main Workspace with Sidebar & Content */}
      <div className="flex flex-1 w-full max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-12 max-w-5xl">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Floating DigiReady Assistant */}
      <FloatingAssistant />
    </div>
  );
}
