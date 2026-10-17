import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-32 text-center">
        <div className="mb-6 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
          Fully On-Chain SVG NFTs
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          Create and Mint
          <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            NFT Collections
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-zinc-400">
          Deploy collections, mint NFTs, and store SVG artwork completely
          on-chain.
        </p>

        <div className="mt-10 flex gap-4">
          <Link
            href="/mint"
            className="rounded-xl bg-white px-6 py-3 font-medium text-black transition hover:opacity-90"
          >
            Start Minting
          </Link>

          <button className="rounded-xl border border-zinc-700 px-6 py-3 font-medium text-zinc-300">
            Learn More
          </button>
        </div>
      </section>
    </main>
  );
}