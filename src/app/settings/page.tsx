import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconSettings, IconLock, IconHelp } from "@/components/ui/Icons";
import { getDemoUser } from "@/server/vault";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const demoUser = await getDemoUser();

  const settingsSections = [
    {
      title: "Language & Regional Preferences",
      description: "Select your preferred display language for public service guidance.",
      items: [
        { label: "Display Language", value: "English (India)", badge: "Active" },
        { label: "Regional Formats", value: "Kannada, Hindi", badge: "Prototype" },
      ],
    },
    {
      title: "Privacy & Data Protection",
      description: "Control data usage and ephemeral document analysis preferences.",
      items: [
        { label: "Document Content Retention", value: "Strictly Ephemeral (Never Stored)", badge: "Enforced" },
        { label: "Synthetic Demonstration Mode", value: "Enabled", badge: "Enforced" },
        { label: "Telemetry & Logs", value: "Local Session Only", badge: "Active" },
      ],
    },
    {
      title: "Accessibility",
      description: "Display and interaction adjustments for accessible reading.",
      items: [
        { label: "Color Contrast", value: "Standard High Contrast", badge: "Active" },
        { label: "Keyboard Navigation", value: "Full Focus Ring Support", badge: "Active" },
        { label: "Screen Reader Support", value: "ARIA Semantics", badge: "Active" },
      ],
    },
    {
      title: "Notifications & Reminders",
      description: "Service deadline reminders and document expiration warnings.",
      items: [
        { label: "Document Expiry Alerts", value: "Enabled for 30 days prior", badge: "Preview" },
        { label: "Application Readiness Alerts", value: "Enabled", badge: "Preview" },
      ],
    },
  ];

  return (
    <AppShell userDisplayName={demoUser.displayName}>
      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Settings & Preferences
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your document wallet preferences and accessibility options.
          </p>
        </div>

        {/* Settings Sections */}
        <div className="flex flex-col gap-4">
          {settingsSections.map((section) => (
            <Card key={section.title} className="p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {section.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                {section.description}
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {item.value}
                      </span>
                      <Badge
                        variant={item.badge === "Enforced" ? "success" : item.badge === "Active" ? "info" : "outline"}
                        size="sm"
                      >
                        {item.badge}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Notice */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-start gap-3">
          <IconHelp className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Preferences marked as <span className="font-semibold text-slate-700 dark:text-slate-300">Enforced</span> reflect fundamental core privacy guarantees. Settings marked as <span className="font-semibold text-slate-700 dark:text-slate-300">Preview</span> represent future capabilities.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
