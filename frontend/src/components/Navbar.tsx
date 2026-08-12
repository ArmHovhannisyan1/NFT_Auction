"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white"
        >
          SVG Mint
        </Link>

        <div className="flex items-center gap-6">
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