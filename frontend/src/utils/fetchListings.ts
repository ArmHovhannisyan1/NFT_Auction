import "server-only";

export type Listing = {
    nftContract: string;
    tokenId: string;
    user: string;
    price: string;
};

type ListingQueryResponse = {
    data?: {
        allMarketplaceNftIsListeds?: {
            nodes?: unknown;
        } | null;
    } | null;
    errors?: { message: string }[];
};

const GET_LISTED_AUCTIONS =
    `query Listings {
  allMarketplaceNftIsListeds {
    nodes {
      nftContract
      tokenId
      user
      price
    }
  }
}
`

function isListing(value: unknown): value is Listing {
    if (typeof value !== "object" || value === null) return false;

    const listing = value as Record<string, unknown>;
    return (
        typeof listing.nftContract === "string" &&
        typeof listing.user === "string" &&
        typeof listing.tokenId === "string" && /^\d+$/.test(listing.tokenId) &&
        typeof listing.price === "string" && /^\d+$/.test(listing.price)
    );
}

export async function fetchListings(): Promise<Listing[]> {
    const endpoint = process.env.GRAPHQL_API_URL;
    if (!endpoint) throw new Error("GRAPHQL_API_URL is not configured.");

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: GET_LISTED_AUCTIONS
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
    });
    // An HTTP failure might contain HTML rather than JSON.
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const payload: ListingQueryResponse | null = await response.json();
    if (payload?.errors?.length) {
        throw new Error(`GraphQL error: ${payload.errors.map((error) => error.message).join(", ")}`);
    }

    const listings = payload?.data?.allMarketplaceNftIsListeds?.nodes;
    if (!Array.isArray(listings) || !listings.every(isListing)) {
        throw new Error("GraphQL returned an invalid listings response.");
    }

    return listings;
}

