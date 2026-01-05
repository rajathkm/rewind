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

export const metadata: Metadata = {
  title: {
    default: "Rewind - Content Aggregator",
    template: "%s | Rewind",
  },
  description:
    "Your personal content aggregation and summarization companion. Never miss key insights from newsletters, podcasts, and RSS feeds.",
  keywords: [
    "content aggregator",
    "newsletter",
    "podcast",
    "RSS",
    "summarization",
    "AI",
    "reading",
  ],
  authors: [{ name: "Rewind" }],
  creator: "Rewind",
  publisher: "Rewind",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Rewind - Content Aggregator",
    description:
      "Your personal content aggregation and summarization companion.",
    siteName: "Rewind",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rewind - Content Aggregator",
    description:
      "Your personal content aggregation and summarization companion.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rewind",
  },
  applicationName: "Rewind",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
