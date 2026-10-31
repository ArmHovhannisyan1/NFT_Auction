"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Listing } from "@/utils/fetchListings";
import styles from "./marketplace.module.css";
import { useChainId, useReadContract } from "wagmi";
import { chainToContract } from "@/constants/contractAddresses";
import { marketplaceAbi } from "@/constants/abis/marketplaceAbi";
import { createNftAbi } from "@/constants/abis/createNftAbi";

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
function useNftMetadata(nftContract: `0x${string}`, tokenId: string) {
    const { data, isLoading, error } = useReadContract({
        address: nftContract,
        abi: createNftAbi,
        functionName: "tokenURI",
        args: [BigInt(tokenId)]
    })

    if (isLoading) return { image: undefined, isLoading: true, isError: false }
    if (error) return { image: undefined, isLoading: false, isError: true }

    if (data) {
        try {
            const base64 = data.split(',')[1]
            const jsonString = window.atob(base64)
            const metadata = JSON.parse(jsonString)
            if (typeof metadata.image !== "string" || !metadata.image.trim()) {
                return { image: undefined, isLoading: false, isError: true };
            }
            return {
                image: metadata.image || null,
                isLoading: false,
                isError: false
            }
        } catch (err) {
            return { image: null, isLoading: false, isError: true }
        }
    }

    return { image: undefined, isLoading: false, isError: false }
}

function auctionStatus(auction: Auction | undefined, unixSeconds: bigint) {
    if (!auction) return;
    if (auction.seller === "0x0000000000000000000000000000000000000000") return "unavailable"

    if (auction?.auctionState == 0) return "awaiting-first-bid"

    if (auction?.auctionState == 1 && unixSeconds > auction?.deadline) return "awaiting-finalization"

    else if (auction?.auctionState == 2) return "finalized"

    else return "active"
}

const statusLabels = {
    unavailable: "Unavailable",
    "awaiting-first-bid": "Awaiting first bid",
    "awaiting-finalization": "Awaiting finalization",
    finalized: "Finalized",
    active: "Active",
};

function formatCountdown(deadline: bigint, now: bigint) {
    const remaining = deadline > now ? deadline - now : 0n;
    const hours = remaining / 3600n;
    const minutes = (remaining % 3600n) / 60n;
    const seconds = remaining % 60n;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function AuctionDetails({ data, isLoading, error }: {
    data: ReturnType<typeof useAuction>["data"];
    isLoading: boolean;
    error: ReturnType<typeof useAuction>["error"];
}) {
    const [now, setNow] = useState<bigint | null>(null);

    // Keep clock updates inside auction details, away from metadata decoding.
    // The initial null also keeps server and first client renders identical.
    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(BigInt(Math.floor(Date.now() / 1000)));
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);
    const status = !isLoading && !error && data && now !== null
        ? auctionStatus(data, now)
        : undefined;

    return (
        <>
            <div>
                <dt>Current auction state</dt>
                <dd aria-live="polite">
                    {error ? (
                        <span className={styles.readError} role="alert">
                            Unable to read auction state. Reload the page to try again.
                        </span>
                    ) : isLoading || now === null ? (
                        <span className={styles.stateHint}>Loading auction state...</span>
                    ) : status ? (
                        <span className={styles.statusBadge} data-status={status}>
                            {statusLabels[status]}
                        </span>
                    ) : (
                        <span className={styles.stateHint}>Auction state is not available.</span>
                    )}
                </dd>
            </div>
            {status && status !== "unavailable" && data && (
                <>
                    <div>
                        <dt>{status === "finalized" ? "Winning bid" : "Highest bid"}</dt>
                        <dd className={styles.price}>
                            {data.highestBid === 0n ? (
                                <span>No bids yet</span>
                            ) : (
                                <>{formatPrice(data.highestBid.toString())} <span>USDCM</span></>
                            )}
                        </dd>
                    </div>
                    {status === "active" && now !== null && (
                        <div>
                            <dt>Estimated time remaining</dt>
                            <dd className={styles.countdown} role="timer" aria-live="off">
                                {formatCountdown(data.deadline, now)}
                            </dd>
                        </div>
                    )}
                    <div>
                        <dt>About this status</dt>
                        <dd className={styles.stateHint}>
                            {status === "awaiting-first-bid" && "The timer starts with the first bid."}
                            {status === "awaiting-finalization" && "The deadline has passed. Someone must finalize the auction."}
                            {status === "active" && "Time uses your device clock. The contract determines whether a bid is accepted."}
                            {status === "finalized" && "This auction has been settled."}
                        </dd>
                    </div>
                </>
            )}
        </>
    );
}

function Artwork({ image, isLoading, isError, tokenId }: {
    image: string | null | undefined;
    isLoading: boolean;
    isError: boolean;
    tokenId: string;
}) {
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const canShowImage = !isLoading && !isError && image && failedImage !== image;

    return (
        <div className={styles.artwork} aria-busy={isLoading}>
            {canShowImage ? (
                // On-chain SVG data URIs are displayed directly without an image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    className={styles.artworkImage}
                    src={image}
                    alt={`Artwork for NFT #${tokenId}`}
                    width={240}
                    height={240}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedImage(image)}
                />
            ) : (
                <div className={styles.artworkPlaceholder} role="status">
                    <span className={styles.tokenNumber}>#{tokenId}</span>
                    <span className={styles.previewCaption}>
                        {isLoading ? "Loading artwork..." : isError || (image && failedImage === image)
                            ? "Artwork unavailable" : "No artwork available"}
                    </span>
                </div>
            )}
        </div>
    );
}

function ListingCard({ listing }: { listing: Listing }) {

    const { data, isLoading, error } = useAuction(listing.nftContract, listing.tokenId)
    const { image, isLoading: loading, isError } = useNftMetadata(listing.nftContract, listing.tokenId)

    return (
        <article className={styles.card}>
            <Artwork
                image={image}
                isLoading={loading}
                isError={isError}
                tokenId={listing.tokenId}
            />

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
                    <AuctionDetails data={data} isLoading={isLoading} error={error} />
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
