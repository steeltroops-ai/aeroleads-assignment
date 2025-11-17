import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  title: {
    default: "AI Blog Generator - Programming & Development Articles",
    template: "%s | AI Blog Generator",
  },
  description: "Explore our collection of AI-generated articles on programming, development, and technology. Stay updated with the latest trends and best practices.",
  keywords: ["programming", "development", "technology", "AI", "blog", "tutorials", "coding"],
  authors: [{ name: "AI Blog Generator" }],
  creator: "AI Blog Generator",
  publisher: "AI Blog Generator",
  metadataBase: new URL(process.env.BLOG_BASE_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "AI Blog Generator - Programming & Development Articles",
    description: "Explore our collection of AI-generated articles on programming, development, and technology.",
    siteName: "AI Blog Generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Blog Generator - Programming & Development Articles",
    description: "Explore our collection of AI-generated articles on programming, development, and technology.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification tokens here when deploying
    // google: "your-google-verification-token",
    // yandex: "your-yandex-verification-token",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
