'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { anvil, sepolia } from "wagmi/chains";
export default getDefaultConfig({
    appName: 'NFT Auction',
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
    chains: [sepolia],
    ssr: false,
});
