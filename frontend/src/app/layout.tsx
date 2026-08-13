import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { WalletButton } from "@/components/WalletButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nocturne Finance",
  description: "Privacy-preserving lending & borrowing on Midnight",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-white">
        <Providers>
          <header className="border-b border-gray-800">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-xl font-bold text-indigo-400">
                  Nocturne
                </Link>
                <nav className="hidden md:flex gap-4 text-sm">
                  <Link href="/app" className="text-gray-300 hover:text-white transition">
                    App
                  </Link>
                  <a
                    href="https://github.com/pk1427/nocturne-finance"
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-300 hover:text-white transition"
                  >
                    GitHub
                  </a>
                </nav>
              </div>
              <WalletButton />
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
