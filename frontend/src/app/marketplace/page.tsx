import { fetchActiveAuctions } from "@/lib/fetchActiveAuctions";

const MarketplacePage = async () => {
    console.log(await fetchActiveAuctions());
    return (
        <div>
            ddd
        </div>
    )
}

export default MarketplacePage
