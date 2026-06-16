import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getAllPatterns } from "@/lib/patterns";
import { SearchDialog } from "@/search/SearchDialog";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://skyboy.in"),

  title: {
    default: "Skyboy AI Patterns",
    template: "%s | Skyboy AI Patterns",
  },

  description:
    "Production-ready AI engineering patterns for agents, RAG, evaluations, fine-tuning, deployment and many more.",

  openGraph: {
    title: "Skyboy AI Patterns",
    description:
      "Production-ready AI engineering patterns for agents, RAG, evaluations, fine-tuning, deployment and many more.",
    url: "https://skyboy.in",
    siteName: "Skyboy AI Patterns",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Skyboy AI Patterns",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Skyboy AI Patterns",
    description:
      "Production-ready AI engineering patterns for agents, RAG, evaluations, fine-tuning, deployment and many more.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  alternates: {
    canonical: "https://skyboy.in",
  },
  keywords: [
    "AI Patterns",
    "AI Engineering",
    "RAG",
    "Agents",
    "Fine Tuning",
    "LLM",
    "AI Architecture",
  ],

  authors: [
    {
      name: "Ankit Bari",
      url: "https://skyboy.in",
    },
  ],

  creator: "Ankit Bari",
  publisher: "Skyboy AI Patterns",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const patterns = await getAllPatterns();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Navbar />
          <SearchDialog patterns={patterns} />
          <main className="min-h-[calc(100vh-8rem)]">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
