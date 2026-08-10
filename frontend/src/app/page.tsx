import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Nocturne Finance</h1>
        <p className="text-lg text-gray-300">
          Privacy-preserving lending & borrowing on Midnight.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/app"
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition"
          >
            Launch App
          </Link>
          <a
            href="https://github.com/pk1427/nocturne-finance"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-600 px-6 py-3 font-semibold hover:border-gray-400 transition"
          >
            GitHub
          </a>
        </div>
        <p className="text-sm text-gray-500">
          Connect your Lace wallet to get started.
        </p>
      </div>
    </main>
  );
}
