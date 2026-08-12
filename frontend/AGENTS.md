# Frontend Agent Guide

This package is the Next.js frontend for the NFT auction app. Keep changes focused on the `src/` tree and follow the existing app-router and Tailwind utility style.

## Work In This Repo

- Use `npm run dev`, `npm run build`, and `npm run lint` from `frontend/`.
- Treat `src/app/` as route and layout code, and `src/components/` as reusable UI pieces.
- Keep wallet and chain setup centralized in `src/app/providers.tsx` and `src/rainbowKitConfig.tsx`.
- Keep contract addresses and chain-specific constants in `src/constants/`; update them only when the deployed contracts change.
- Use client components only when hooks, wallet state, or browser-only APIs are required.

## Conventions

- Prefer small, local edits over broad rewrites.
- Preserve the current UI language and utility-class approach unless the task is explicitly a redesign.
- Do not edit generated or vendor folders such as `.next/` or `node_modules/`.
- For framework-level changes, check the Next.js 16 docs under `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Project References

- Frontend overview: [README.md](README.md)
- Wallet config: `src/rainbowKitConfig.tsx`
- Contract constants: `src/constants/contractAddresses.ts`
- Shared UI: `src/components/`

## Who I Am

I'm a beginner Solidity/Web3 developer learning by building, not by having code handed to me.
I already understand Solidity, Foundry, wagmi/viem fundamentals, and basic contract integration.
I do NOT want you to write full features for me silently. I want to understand every piece of code
that goes into this repo — architecture decisions, data flow, and why something works, not just that it works.

## How You Should Work With Me

- Never silently implement a full feature end-to-end. Break work into small, explainable steps.
- Before writing non-trivial code (new hooks, new contract read/write flows, new state logic),
  explain the approach in plain English first and wait for my confirmation.
- When fixing a bug, explain WHAT was wrong and WHY — not just the diff.
- Flag any assumption you're making about my contracts, ABIs, or intended architecture instead of guessing silently.
- If a task has multiple valid approaches (e.g., re-fetch vs. append state), present the tradeoff instead of picking one for me.
- Do not add libraries, patterns, or abstractions I haven't asked for, even if "more correct" — ask first.
- Push back if something I ask for is architecturally wrong (e.g., storing data that should come from chain state, wrong CEI order, wrong wagmi hook) — don't just comply.