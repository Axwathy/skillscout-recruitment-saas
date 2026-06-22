import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";

import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const description = "AI-assisted recruitment platform — math ranks, AI explains, you decide.";

export const metadata: Metadata = {
  metadataBase: new URL("https://skillscout.app"),
  title: {
    default: "SkillScout — AI Recruitment",
    template: "%s · SkillScout",
  },
  description,
  applicationName: "SkillScout",
  keywords: [
    "recruitment",
    "applicant tracking system",
    "AI hiring",
    "candidate screening",
    "talent",
    "SkillScout",
  ],
  openGraph: {
    title: "SkillScout — AI Recruitment",
    description: "Math ranks. AI explains. You decide.",
    siteName: "SkillScout",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillScout — AI Recruitment",
    description: "Math ranks. AI explains. You decide.",
  },
};

export const viewport: Viewport = {
  themeColor: "#EB4425",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={urbanist.variable}>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#EB4425] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-glass-lg"
        >
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
