import "@/ui/styles/globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Footer } from "@/ui/layout/Footer";
import { Navbar } from "@/ui/layout/Navbar";
import { getAllPatterns } from "@/core/patterns";
import { SearchDialog } from "@/ui/search/SearchDialog";
import { APP_NAME, SITE_URL } from "@/core/constants";

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
  metadataBase: new URL(SITE_URL),

  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },

  description:
    "Production-ready patterns, architectures, and implementation guides for modern software and AI systems.",

  openGraph: {
    title: APP_NAME,
    description:
      "Production-ready patterns, architectures, and implementation guides for modern software and AI systems.",
    url: SITE_URL,
    siteName: APP_NAME,
    type: "website",
    images: [
      {
        url: "/skyboy.png",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description:
      "Production-ready patterns, architectures, and implementation guides for modern software and AI systems.",
    images: ["/skyboy.png"],
  },

  icons: {
    icon: "/skyboy.png",
    shortcut: "/skyboy.png",
    apple: "/skyboy.png",
  },

  alternates: {
    canonical: SITE_URL,
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
      url: SITE_URL,
    },
  ],

  creator: "Ankit Bari",
  publisher: APP_NAME,
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
