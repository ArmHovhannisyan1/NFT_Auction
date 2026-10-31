import { createNftAbi } from "@/constants/abis/createNftAbi";
import { chainToContract } from "@/constants/contractAddresses";
import { useAccount, useChainId, useConfig, useReadContract, useWriteContract } from "wagmi";
import { readContract } from "wagmi/actions";

export function useNftApproval(nftContract: `0x${string}`, tokenId: bigint) {
    const chainId = useChainId();
    const marketplaceAddress = chainToContract[chainId]['marketplace']
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { address } = useAccount();

    const { data: ownerOfNft, isLoading: ownerLoading, isError: ownerError } = useReadContract({
        address: nftContract,
        abi: createNftAbi,
        functionName: 'ownerOf',
        args: [tokenId]
    });
    const { data: ownerOfApprovedNft, isLoading: approvedLoading, isError: approvedError } = useReadContract({
        address: nftContract,
        abi: createNftAbi,
        functionName: 'getApproved',
        args: [tokenId]
    });
    const { data: ownerOfAllApprovedNft, isLoading: allApprovedLoading, isError: allApprovedError } = useReadContract({
        address: nftContract,
        abi: createNftAbi,
        functionName: 'isApprovedForAll',
        args: [ownerOfNft as `0x${string}`, marketplaceAddress as `0x${string}`],
        query: {
            enabled: Boolean(ownerOfNft)
            // enabled: false (pause the query) Boolean(undefined) == false
            // enabled: true (run the query)
        }
    });


    const handleApprove = () => {
        writeContract({
            address: nftContract,
            abi: createNftAbi,
            functionName: 'approve',
            args: [marketplaceAddress as `0x${string}`, tokenId]
        })
    }

    const isChecking = approvedLoading || ownerLoading || allApprovedLoading
    const isError = Boolean(error) || approvedError || ownerError || allApprovedError

    const isOwner = Boolean(
        address &&
        ownerOfNft &&
        ownerOfNft.toLowerCase() === address.toLowerCase()
    );
    const isMarketplaceApproved =
        ownerOfApprovedNft?.toLowerCase() === marketplaceAddress.toLowerCase() ||
        ownerOfAllApprovedNft === true;

    return {
        handleApprove,
        hash,
        isOwner,
        isMarketplaceApproved,
        isChecking,
        isPending,
        isError
    }

}