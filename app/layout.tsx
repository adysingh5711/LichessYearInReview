import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = 'https://lichess-review.vercel.app/'; // Replace with your actual base URL!

export const metadata: Metadata = {
  title: "Lichess Review",
  description: "Analyze your chess games and track your progress with the Lichess Review. Created with ❤️ by Aditya and the Open Source Community.",
  keywords: "chess, lichess, year in review, game analysis, statistics, chess performance",
  authors: [{ name: "Aditya Singh", url: "https://www.linkedin.com/in/singhaditya5711/" }],
  creator: "Aditya Singh",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Lichess Review',
    title: 'Lichess Review',
    description: 'Analyze your chess games and track your progress with the Lichess Review. Created with ❤️ by Aditya and the Open Source Community.',
    images: [
      {
        url: `${baseUrl}/api/screenshot?title=${encodeURIComponent('Lichess Review')}&description=${encodeURIComponent('Analyze your chess games and track your progress!')}`,
        width: 1200,
        height: 630,
        alt: 'Lichess Review Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@yourtwitterhandle',
    title: 'Lichess Review',
    description: 'Analyze your chess games and track your progress with the Lichess Review. Created with ❤️ by Aditya and the Open Source Community.',
    images: `${baseUrl}/api/screenshot?title=${encodeURIComponent('Lichess Review')}&description=${encodeURIComponent('Analyze your chess games and track your progress!')}`,
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
        <meta property="twitter:image" content={`${baseUrl}/api/screenshot?title=${encodeURIComponent('Lichess Review')}&description=${encodeURIComponent('Analyze your chess games and track your progress!')}`} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Lichess Review" />
        <meta property="twitter:description" content="Analyze your chess games and track your progress with the Lichess Review. Created with ❤️ by Aditya and the Open Source Community." />
        <meta property="og:image" content={`${baseUrl}/api/screenshot?title=${encodeURIComponent('Lichess Review')}&description=${encodeURIComponent('Analyze your chess games and track your progress!')}`} />
        <meta property="og:site_name" content="Lichess Review" />
        <meta property="og:title" content="Lichess Review" />
        <meta property="og:description" content="Analyze your chess games and track your progress with the Lichess Review. Created with ❤️ by Aditya and the Open Source Community." />
        <meta property="og:url" content={baseUrl} />
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
        <SpeedInsights />
      </body>
    </html>
  );
}
