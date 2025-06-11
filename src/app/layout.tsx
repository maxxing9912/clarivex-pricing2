import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./api/providers";
import AuthStatus from "./api/AuthStatus"; // lo mettiamo qui per non duplicare

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clarivex",
  description: "Unlock powerful moderation and XP features for your server.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <header className="sticky top-0 backdrop-blur bg-white/80 z-20 shadow-sm">
            <div className="container mx-auto flex items-center justify-between px-6 py-4 max-w-6xl">
              <h1 className="text-2xl font-extrabold">Clarivex</h1>
              <AuthStatus />
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}