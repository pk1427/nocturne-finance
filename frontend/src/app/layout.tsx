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
      <body className="antialiased">
        <Providers>
          <header className="fixed inset-x-0 top-5 z-40 px-4">
            <div className="glass-panel mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl px-3 sm:px-5">
              <div className="flex items-center gap-5 sm:gap-9">
                <Link href="/" className="font-display flex items-center gap-2.5 text-lg font-bold tracking-[0.18em] text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-400/10 text-cyan-200">N</span>
                  NOCTURNE
                </Link>
                <nav className="hidden items-center gap-6 text-[11px] font-medium tracking-[0.14em] text-slate-400 md:flex">
                  <Link href="/app" className="transition hover:text-cyan-200">
                    DASHBOARD
                  </Link>
                  <a
                    href="https://github.com/pk1427/nocturne-finance"
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-cyan-200"
                  >
                    GitHub
                  </a>
                </nav>
              </div>
              <WalletButton />
            </div>
          </header>
          <div className="pt-24">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
