import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import "drawably/style.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const description =
  "Know the moment your coding agent is done, and keep it working while you're away. Skyboy is a desktop notifier for Claude Code and Codex.";

export const metadata: Metadata = {
  metadataBase: new URL("https://skyboy.in"),
  title: {
    default: "Skyboy",
    template: "%s · Skyboy",
  },
  description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Skyboy",
    description,
    url: "https://skyboy.in",
    images: [{ url: "/logo-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "Skyboy",
    description,
    images: ["/logo-512.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
