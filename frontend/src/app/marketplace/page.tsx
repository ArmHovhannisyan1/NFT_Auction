import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchListings, type Listing } from "@/utils/fetchListings";
import ListingsBrowser from "./ListingsBrowser";
import styles from "./marketplace.module.css";

export const metadata: Metadata = {
    title: "Marketplace | SVG Mint",
    description: "Explore NFT listing records on Sepolia.",
};

async function ListingResults() {
    let listings: Listing[];

    try {
        listings = await fetchListings();
    } catch (error) {
        console.error("Unable to load marketplace listings:", error);
        return <ListingsBrowser listings={[]} failed />;
    }

    return <ListingsBrowser listings={listings} />;
}

function ListingsLoading() {
    return (
        <div role="status" aria-label="Loading listings" aria-busy="true">
            <p className={styles.resultCount}>Loading listings…</p>
            <div className={styles.grid} aria-hidden="true">
                {[0, 1, 2].map((index) => (
                    <div className={`${styles.card} ${styles.skeleton}`} key={index}>
                        <div className={styles.skeletonPreview} />
                        <div className={styles.cardBody}>
                            <div className={styles.skeletonLine} />
                            <div className={styles.skeletonLine} />
                            <div className={styles.skeletonLine} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function MarketplacePage() {
    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <span className={styles.network}>Sepolia testnet</span>
                <h1 className={styles.title}>Explore listings</h1>
                <p className={styles.intro}>
                    Discover NFTs listed by the community. Prices are in mock USDC.
                </p>
                <p className={styles.notice}>
                    These records show when NFTs were listed. An auction may have since
                    ended or been canceled; current availability is not shown yet.
                </p>
            </header>

            <Suspense fallback={<ListingsLoading />}>
                <ListingResults />
            </Suspense>
        </main>
    );
}
