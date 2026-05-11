import type { Metadata } from "next";
import "./globals.css";
import VoiceDoctor from "@/components/VoiceDoctor";

export const metadata: Metadata = {
  title: "GlucoMind GS3 — AI Diabetes SaaS",
  description:
    "Dexcom-style CGM SaaS for Sibionics GS3: realtime glucose stream, AI voice doctor, Telegram Mini App login, Hutko subscriptions, i18n and dashboard.",
  openGraph: {
    title: "GlucoMind GS3 — CGM + AI + Hutko subscriptions",
    description: "Realtime CGM dashboard, AI prediction, voice assistant, Telegram Mini App and Hutko/PUMB billing.",
    images: ["/product/sibionics-gs3-hero.webp"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        {children}
        <VoiceDoctor />
      </body>
    </html>
  );
}
