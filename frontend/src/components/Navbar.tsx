"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white"
        >
          SVG Mint
        </Link>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/marketplace"
            className="text-sm font-medium text-zinc-300 transition hover:text-white"
          >
            Marketplace
          </Link>

          <Link
            href="/mint"
            className="text-sm font-medium text-zinc-300 transition hover:text-white"
          >
            Mint NFT
          </Link>

          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
