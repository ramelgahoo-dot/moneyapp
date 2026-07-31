import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "MoneyApp",
  description: "Car flipping & investment tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MoneyApp",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
    apple: [
      { url: "/favicon.ico", sizes: "180x180", type: "image/x-icon" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#e5f0ff",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="app-atmo h-full flex flex-col text-gray-100 md:flex-row">
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
