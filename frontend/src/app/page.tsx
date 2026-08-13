import Link from "next/link";

const features = [
  ["Private positions", "Your supplied and borrowed balances stay in wallet-managed private state."],
  ["Proof-backed calls", "Every state transition is proven before Lace balances and submits it."],
  ["Preview live", "A real Midnight Preview contract powers the demonstrated lending loop."],
];

export default function Home() {
  return (
    <main className="nocturne-shell">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center px-5 py-16 sm:px-8">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_#22d3ee]" />
              <span className="eyebrow !text-[0.63rem] !tracking-[0.12em]">Live on Midnight Preview</span>
            </div>
            <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Confidential
              <span className="block bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-400 bg-clip-text pb-2 text-transparent">Lending, in the dark.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              A real Preview lending-accounting loop for Midnight. Build a confidential position, prove each action, and sign through Lace.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/app" className="gradient-border font-display inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-cyan-100 transition hover:scale-[1.02]">
                Enter protocol <span aria-hidden>↗</span>
              </Link>
              <a href="https://github.com/pk1427/nocturne-finance" target="_blank" rel="noreferrer" className="font-mono-ui inline-flex items-center justify-center gap-2 text-sm text-slate-400 transition hover:text-white">
                View source <span aria-hidden>→</span>
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md py-8">
            <div className="absolute inset-4 rounded-full border border-cyan-200/10" />
            <div className="absolute inset-12 rounded-full border border-dashed border-indigo-200/10" />
            <div className="glass-panel relative ml-auto rounded-2xl border-t-cyan-300/35 p-5 sm:w-[82%]">
              <div className="flex items-center justify-between"><span className="font-display font-semibold">Private reserve</span><span className="font-mono-ui text-[10px] text-cyan-200">ACTIVE</span></div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-400 to-sky-300" /></div>
              <p className="font-mono-ui mt-3 text-xs text-slate-500">Witness state secured</p>
            </div>
            <div className="glass-panel relative mt-8 rounded-2xl border-l-indigo-300/40 p-5 sm:w-[90%]">
              <p className="eyebrow !text-[0.6rem]">ZK transaction flow</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-300"><span className="rounded bg-cyan-400/10 px-2 py-1 text-cyan-200">Prove</span><span className="text-slate-600">→</span><span className="rounded bg-indigo-400/10 px-2 py-1 text-indigo-200">Lace</span><span className="text-slate-600">→</span><span className="rounded bg-emerald-400/10 px-2 py-1 text-emerald-200">Commit</span></div>
            </div>
            <div className="glass-panel relative ml-auto mt-8 rounded-2xl p-5 sm:w-[72%]">
              <p className="font-display text-sm font-semibold text-white">Fixed reserve MVP</p>
              <p className="font-mono-ui mt-2 text-xs text-slate-500">Index 1,000,000 · Preview</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="border-t border-white/10 pt-14"><p className="eyebrow">Protocol primitives</p><h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">Built for a private lending workflow.</h2></div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map(([title, description], index) => <article key={title} className="glass-panel group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-cyan-300/25"><span className="font-mono-ui text-xs text-cyan-300">0{index + 1}</span><h3 className="font-display mt-8 text-xl font-bold">{title}</h3><p className="mt-3 leading-relaxed text-slate-400">{description}</p></article>)}
        </div>
      </section>
    </main>
  );
}
