import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailForge — Email Campaign Dashboard",
  description: "Professional email campaign management dashboard with Gmail integration, batch sending, and real-time analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
