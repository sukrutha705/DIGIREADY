import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: "DigiReady — Indian Citizen Application Readiness Platform",
    template: "%s | DigiReady",
  },
  description:
    "Know what you need. Check what you have. Detect conflicts. Fix issues. Know when you're ready to apply.",
  applicationName: "DigiReady",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DigiReady",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "DigiReady",
    title: "DigiReady — Application Readiness & Conflict Resolution Platform",
    description:
      "Prepare your documents, evaluate eligibility, detect cross-document identity conflicts, and know when you are ready to apply for Indian examinations, scholarships, and citizen services.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiReady — Citizen Application Readiness",
    description:
      "Know what you need. Check what you have. Detect conflicts. Fix issues. Know when you're ready to apply.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
