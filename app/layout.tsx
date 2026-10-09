import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "next-themes";
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

const title = "Lichess Review";
const description = "Analyze your chess games and track your progress with the Lichess Review. Created with ❤️ by Aditya and the Open Source Community.";
const image = { url: "/Lichess%20Review.png", width: 1920, height: 1080, alt: title };

export const metadata: Metadata = {
  metadataBase: new URL("https://lichess-review.vercel.app"),
  title,
  description,
  keywords: "chess, lichess, year in review, game analysis, statistics, chess performance",
  authors: [{ name: "Aditya Singh", url: "https://www.linkedin.com/in/singhaditya5711/" }],
  creator: "Aditya Singh",
  openGraph: { type: "website", locale: "en_US", url: "/", siteName: title, title, description, images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
