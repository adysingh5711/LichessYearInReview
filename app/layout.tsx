import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lichess Year in Review",
  description: "Analyze your chess games and track your progress with the Lichess Year in Review. Created with ❤️ by Aditya and the Open Source Community.",
  keywords: "chess, lichess, year in review, game analysis, statistics, chess performance",
  authors: [{ name: "Aditya Singh", url: "https://www.linkedin.com/in/singhaditya5711/" }],
  creator: "Aditya Singh",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://lichess-review.vercel.app/',
    siteName: 'Lichess Year in Review',
    title: 'Lichess Year in Review',
    description: 'Analyze your chess games and track your progress with the Lichess Year in Review. Created with ❤️ by Aditya and the Open Source Community.',
    images: [
      {
        url: 'https://github.com/adysingh5711/LichessYearInReview/blob/main/public/Lichess%20Review.png',
        width: 800,
        height: 600,
        alt: 'Lichess Year in Review Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@yourtwitterhandle',
    title: 'Lichess Year in Review',
    description: 'Analyze your chess games and track your progress with the Lichess Year in Review. Created with ❤️ by Aditya and the Open Source Community.',
    images: 'https://github.com/adysingh5711/LichessYearInReview/blob/main/public/Lichess%20Review.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta property="twitter:image" content="https://github.com/adysingh5711/LichessYearInReview/blob/main/public/Lichess%20Review.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Lichess Year in Review" />
        <meta property="twitter:description" content="Analyze your chess games and track your progress with the Lichess Year in Review. Created with ❤️ by Aditya and the Open Source Community." />
        <meta property="og:image" content="https://github.com/adysingh5711/LichessYearInReview/blob/main/public/Lichess%20Review.png" />
        <meta property="og:site_name" content="Lichess Year in Review" />
        <meta property="og:title" content="Lichess Year in Review" />
        <meta property="og:description" content="Analyze your chess games and track your progress with the Lichess Year in Review. Created with ❤️ by Aditya and the Open Source Community." />
        <meta property="og:url" content="https://lichess-review.vercel.app/" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
