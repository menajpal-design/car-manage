import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";
import PWARegister from "@/components/PWARegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "FleetMaster Pro — Enterprise Fleet Management",
    template: "%s | FleetMaster Pro",
  },
  description:
    "FleetMaster Pro is a complete SaaS fleet management platform for tracking vehicles, maintenance tickets, fuel consumption, payments, and financial reports.",
  keywords: ["fleet management", "vehicle tracking", "fuel logs", "maintenance tickets", "ফ্লিট ম্যানেজমেন্ট"],
  authors: [{ name: "FleetMaster Pro" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FleetMaster Pro",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "FleetMaster Pro",
    title: "FleetMaster Pro — Enterprise Fleet Management",
    description: "Complete SaaS platform for managing fleets, maintenance, fuel, and finances.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PWARegister />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
