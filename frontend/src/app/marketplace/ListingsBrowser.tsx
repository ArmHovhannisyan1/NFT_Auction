"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Listing } from "@/utils/fetchListings";
import styles from "./marketplace.module.css";
import { useChainId, useReadContract } from "wagmi";
import { chainToContract } from "@/constants/contractAddresses";
import { marketplaceAbi } from "@/constants/abis/marketplaceAbi";

type ListingsBrowserProps = {
    listings: Listing[];
    failed?: boolean;
};

type Auction = {
  seller: `0x${string}`;
  auctionState: number;
  startTime: bigint;
  deadline: bigint;
};
// Format the mock token's six decimal places without losing integer precision.
function formatPrice(raw: string) {
    const padded = raw.padStart(7, "0");
    const whole = padded.slice(0, -6).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const fraction = padded.slice(-6).replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : whole;
}

function useAuction(nftContract: `0x${string}`, tokenId: string) {
    const chainId = useChainId();
    const marketplaceAddress = chainToContract[chainId]["marketplace"]
    return useReadContract({
        address: marketplaceAddress as `0x${string}`,
        abi: marketplaceAbi,
        functionName: "getIdToAuction",
        args: [nftContract, BigInt(tokenId)]
    });
}

function ListingCard({ listing }: { listing: Listing }) {
    
    const { data, isLoading, error } = useAuction(listing.nftContract, listing.tokenId)
    
    function auctionStatus(auction: Auction | undefined, unixSeconds: bigint){
        if(!auction) return;
        if(auction?.seller === "0x0000000000000000000000000000000000000000") return "unavailable" 

        if(auction?.auctionState == 0) return "awaiting-first-bid"

        if(auction?.auctionState == 1 && unixSeconds > auction?.deadline) return "awaiting-finalization"      
        
        else if(auction?.auctionState == 2) return "finalized"
        
        else return "active"
    }
    console.log(data)
    return (
        <article className={styles.card}>
            <div className={styles.preview}>
                <span className={styles.recordLabel}>Listing record</span>
                <span className={styles.tokenNumber}>#{listing.tokenId}</span>
                <span className={styles.previewCaption}>Artwork preview unavailable</span>
            </div>

            <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>NFT #{listing.tokenId}</h2>
                <dl className={styles.details}>
                    <div>
                        <dt>Collection</dt>
                        <dd className={styles.address}>{listing.nftContract}</dd>
                    </div>
                    <div>
                        <dt>Listed by</dt>
                        <dd className={styles.address}>{listing.user}</dd>
                    </div>
                    <div className={styles.priceRow}>
                        <dt>Starting price</dt>
                        <dd className={styles.price}>
                            {formatPrice(listing.price)} <span>USDCM</span>
                        </dd>
                    </div>
                    <div>
                        <dt>Auction state</dt>
                        <dd>
                            {data && auctionStatus(data, BigInt(Math.floor(Date.now() / 1000)))}
                        </dd>
                    </div>
                </dl>
            </div>
        </article>
    );
}

export default function ListingsBrowser({ listings, failed = false }: ListingsBrowserProps) {
    const [search, setSearch] = useState("");
    const [isRefreshing, startTransition] = useTransition();
    const router = useRouter();
    const query = search.trim().toLowerCase();

    // Keep separate records for relistings. The query does not yet include an event ID.
    const visibleListings = listings
        .map((listing, index) => ({ listing, recordKey: `${listing.nftContract}:${listing.tokenId}:${index}` }))
        .filter(({ listing }) =>
            [listing.nftContract, listing.tokenId, listing.user].some((value) =>
                value.toString().toLowerCase().includes(query),
            ),
        );

    function refresh() {
        startTransition(() => router.refresh());
    }

    return (
        <section aria-label="Listing records" aria-busy={isRefreshing}>
            <div className={styles.toolbar}>
                <div className={styles.searchField}>
                    <label htmlFor="listing-search">Search listings</label>
                    <input
                        id="listing-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Collection, seller address, or token ID"
                        disabled={failed || listings.length === 0}
                    />
                </div>
                <button
                    type="button"
                    className={styles.button}
                    onClick={refresh}
                    disabled={isRefreshing}
                >
                    {isRefreshing ? "Refreshing…" : failed ? "Try again" : "Refresh listings"}
                </button>
            </div>

            {failed ? (
                <div className={styles.emptyState} role="alert">
                    <h2>Unable to load listings</h2>
                    <p>The listing service could not be reached or returned an error. Please try again.</p>
                </div>
            ) : (
                <>
                    <p className={styles.resultCount} role="status" aria-live="polite">
                        {isRefreshing
                            ? "Refreshing listings…"
                            : `${visibleListings.length} of ${listings.length} listing records shown`}
                    </p>

                    {listings.length === 0 ? (
                        <div className={styles.emptyState}>
                            <h2>No listings yet</h2>
                            <p>Listing records will appear here once they are available. You can mint an NFT in the meantime.</p>
                            <Link href="/mint" className={styles.textLink}>Go to minting →</Link>
                        </div>
                    ) : visibleListings.length === 0 ? (
                        <div className={styles.emptyState}>
                            <h2>No matching listings</h2>
                            <p>Try a different collection, seller address, or token ID.</p>
                            <button type="button" className={styles.button} onClick={() => setSearch("")}>
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {visibleListings.map(({ listing, recordKey }) => (
                                <ListingCard key={recordKey} listing={listing} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
