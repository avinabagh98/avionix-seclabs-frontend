import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import Toaster from "@/components/ui/Toaster";
import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display-next",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body-next",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-next",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Avionix SecLabs",
  description: "Network topology and ACL simulator",
  robots: { index: false, follow: false }, // Prevent indexing for internal tools
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body suppressHydrationWarning>
        <QueryProvider>
          <AppHeader />
          <main className="wrap main">{children}</main>
          <AppFooter />
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}