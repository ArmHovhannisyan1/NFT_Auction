"use client";
import React, { useEffect, useState } from 'react';
import { CreateCollectionForm } from '@/components/CreateCollectionForm';
import { ExistingCollectionSelector } from '@/components/ExistingCollectionSelector';
import { MintNftButton } from '@/components/MintNftButton';
import { MintSuccessImage } from '@/components/MintSuccessImage';
import { useAccount, useChainId, useConfig, useWriteContract } from 'wagmi';
import { nftFactoryAbi } from '@/constants/abis/nftFactoryabi';
import { chainToContract } from '@/constants/contractAddresses';
import { readContract, waitForTransactionReceipt } from '@wagmi/core';
import { decodeEventLog } from 'viem';
import { createNftAbi } from '@/constants/abis/createNftAbi';

export default function MintPage() {
  const [isPendingForCollection, setIsPendingForCollection] = useState(false);
  const [isPendingForMinting, setIsPendingForMinting] = useState(false);
  const [mode, setMode] = useState<'create' | 'select'>('create');
  const [currentCollection, setCurrentCollection] = useState<string>('');
  const [collectionNfts, setCollectionNfts] = useState<string[]>([]);
  const [latestMintedNft, setLatestMintedNft] = useState<string | null>(null);
  const [isLoadingNfts, setIsLoadingNfts] = useState<boolean>(false);

  const [userCollections, setUserCollections] = useState<readonly `0x${string}`[]>([]);
  const [collectionName, setCollectionName] = useState<string>('');
  const [collectionSymbol, setCollectionSymbol] = useState<string>('');

  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const config = useConfig();

  const nftFactoryAddress = chainToContract[chainId]["nftFactory"];

  const handleGettingCollections = async (userAddress: `0x${string}` | undefined) => {
    return await readContract(config, {
      abi: nftFactoryAbi,
      address: nftFactoryAddress as `0x${string}`,
      functionName: "getUsersCollection",
      args: [userAddress as `0x${string}`]
    });
  }

  useEffect(() => {
    const fetchCollections = async () => {
      if (isConnected && address) {
        try {
          const collections = await handleGettingCollections(address);
          if (collections) {
            // 2. Pass it directly now that types match perfectly
            setUserCollections(collections);
          }
        } catch (error) {
          console.error("Failed to fetch collections:", error);
        }
      }
    };

    fetchCollections();
  }, [address, isConnected]);

  useEffect(() => {
    const fetchNameAndSymbol = async () => {
      if (!currentCollection) {
        setCollectionName("");
        setCollectionSymbol('');
        return;
      }
      try {
        const [nameVal, symbolVal] = await Promise.all([
          readContract(config, {
            abi: createNftAbi,
            address: currentCollection as `0x${string}`,
            functionName: "name",
          }),
          readContract(config, {
            abi: createNftAbi,
            address: currentCollection as `0x${string}`,
            functionName: "symbol"
          })
        ])
        setCollectionName(nameVal as string)
        setCollectionSymbol(symbolVal as string)
      } catch (error) {
        console.error("ERROR fetchin name and symbol", error);
        setCollectionName('');
        setCollectionSymbol('');
      }
    }
    fetchNameAndSymbol();
  }, [currentCollection, config])

  const handleCreate = async (name: string, symbol: string) => {
    if (!chainId) return;
    setIsPendingForCollection(true);
    try {
      const txHash = await writeContractAsync({
        abi: nftFactoryAbi,
        address: nftFactoryAddress as `0x${string}`,
        functionName: "createCollection",
        args: [name, symbol]
      });
      console.log("Tx hash: ", txHash);

      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash
      });
      console.log(receipt);
      // 1. Find the log emitted by the factory contract
      const factoryLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === nftFactoryAddress.toLowerCase()
      );

      if (factoryLog) {
        try {
          // 2. Decode the log using the ABI
          const decoded = decodeEventLog({
            abi: nftFactoryAbi,
            data: factoryLog.data,
            topics: factoryLog.topics,
          });

          // 3. Access the parameters from decoded.args
          // Type definition automatically matches your event parameters!
          const newestCollectionAddress = decoded.args.nftAddress;
          console.log("Collection deployed at:", newestCollectionAddress);
          if (newestCollectionAddress) {
            setUserCollections((prev) => [...prev, newestCollectionAddress]);
            setCurrentCollection(newestCollectionAddress);
          }
          setMode('select');
        } catch (error) {
          console.error("Failed to decode contract event log:", error);
        }
      }
    } catch (error) {
      console.error("Error: ", error);
    } finally {
      setIsPendingForCollection(false);
    }
  };

  const handleSelect = (address: string) => {
    setCurrentCollection(address);
  };

  useEffect(() => {
    const fetchAllNftsForCollection = async (collectionAddress: `0x${string}`) => {
      if (!collectionAddress) {
        setCollectionNfts([]);
        setLatestMintedNft(null);
        return;
      }
      setIsLoadingNfts(true);
      setLatestMintedNft(null);
      try {
        const tokenQuan = await readContract(config, {
          abi: createNftAbi,
          address: collectionAddress as `0x${string}`,
          functionName: 'getTokenCounter',
          args: []
        })
        console.log(tokenQuan);

        let i;
        const images: string[] = [];
        /* bigint error fix (tokenQuan - bigint, i - number) should be ES2020 in tsconfig.json */
        for (i = 0n; i < tokenQuan; i++) {
          const tokenUriResult = await readContract(config, {
            abi: createNftAbi,
            address: collectionAddress as `0x${string}`,
            functionName: 'tokenURI',
            args: [i]
          })
          const base64 = tokenUriResult.split(',')[1]
          const jsonString = window.atob(base64)
          const metadata = JSON.parse(jsonString)
          images.push(metadata.image);
        }
        setCollectionNfts(images)
      } catch (error) {
        console.error("Error: Failed to fetch NFTs", error)
      } finally {
        setIsLoadingNfts(false);
      }
    }
    fetchAllNftsForCollection(currentCollection as `0x${string}`)
  }, [currentCollection, config])

  const handleMint = async () => {
    if (!currentCollection) return;
    setIsPendingForMinting(true);
    try {
      const txHash = await writeContractAsync({
        abi: createNftAbi,
        address: currentCollection as `0x${string}`,
        functionName: 'mintNft',
        args: []
      })

      const receipt = await waitForTransactionReceipt(config, {
        hash: txHash
      });
      console.log(receipt);

      let tokenId: bigint | undefined;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === currentCollection.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: createNftAbi,
              data: log.data,
              topics: log.topics
            });
            // Make sure we only capture and break when we get the correct event!
            if (decoded.eventName === 'CreateNft__NFTMinted') {
              console.log("Successfully decoded NFT Minted event!", decoded);
              tokenId = decoded.args.tokenNumber;
              break;
            }
          } catch (e) {
            console.log(`Failed to decode log:`, e);
          }
        }
      }

      if (tokenId === undefined) {
        throw new Error("Could not find tokenId in transaction logs");
      }

      const tokenUriResult = await readContract(config, {
        abi: createNftAbi,
        address: currentCollection as `0x${string}`,
        functionName: 'tokenURI',
        args: [tokenId]
      })

      const base64 = tokenUriResult.split(',')[1]
      const jsonString = window.atob(base64)
      const metadata = JSON.parse(jsonString)
      setLatestMintedNft(metadata.image);
      setCollectionNfts((prev) => [...prev, metadata.image]);
    }
    catch (error) {
      console.error("Error:", error)
    } finally {
      setIsPendingForMinting(false);
    }
  }


  return (
    // 1. Add "relative" to the main wrapper container
    <div className="relative max-w-xl mx-auto p-6 space-y-6">

      {/* 2. Full-Page Loading Overlay Spinner */}
      {isPendingForCollection && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="flex flex-col items-center space-y-4 p-6 bg-neutral-900/90 rounded-2xl shadow-xl border border-neutral-800">
            {/* Tailwind CSS CSS-only Animated Spinner */}
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-white font-medium text-sm animate-pulse">
              Deploying collection on-chain...
            </p>
          </div>
        </div>
      )}

      {isPendingForMinting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="flex flex-col items-center space-y-4 p-6 bg-neutral-900/90 rounded-2xl shadow-xl border border-neutral-800">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-white font-medium text-sm animate-pulse">
              Minting your unique NFT on-chain...
            </p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">Mint Your NFT</h1>
      <p className="text-gray-600">
        Connect your wallet, then create or select a collection to mint from.
      </p>

      {/* Collection Selection */}
      <div className="flex space-x-4 mt-4">
        <button
          onClick={() => setMode('create')}
          className={`px-4 py-2 rounded ${mode === 'create' ? 'bg-blue-500 text-white' : 'border'}`}
          disabled={isPendingForCollection}
        >
          Create New
        </button>
        <button
          onClick={() => setMode('select')}
          className={`px-4 py-2 rounded ${mode === 'select' ? 'bg-blue-500 text-white' : 'border'}`}
          disabled={isPendingForCollection}
        >
          Select Existing
        </button>
      </div>

      {mode === 'create' ? (
        <CreateCollectionForm onCreate={handleCreate} />
      ) : (
        <>
          <ExistingCollectionSelector
            collections={userCollections}
            onSelect={handleSelect}
            value={currentCollection || ""}
            name={collectionName}
            symbol={collectionSymbol}
          />

          {/* Mint Section */}
          {currentCollection && (
            <div className="mt-6 border-t border-neutral-800 pt-6">
              <h2 className="text-xl font-medium text-white mb-2">Current Collection: {currentCollection}</h2>
              <MintNftButton
                onMint={handleMint}
                disabled={!currentCollection || isPendingForCollection || isPendingForMinting}
              />
            </div>
          )}

          {/* Collection NFTs Gallery Grid */}
          {currentCollection && (
            <div className="mt-8 border-t border-neutral-800 pt-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Collection Gallery</h3>
              
              {isLoadingNfts ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                  <p className="text-neutral-400 text-sm animate-pulse">Loading collection NFTs...</p>
                </div>
              ) : collectionNfts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {collectionNfts.map((url, idx) => (
                    <div key={idx} className="relative aspect-square bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-md transition-all duration-200 hover:scale-102 hover:border-purple-500/40">
                      <img src={url} alt={`NFT #${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px] px-3 py-1.5 text-center">
                        <span className="text-xs font-semibold text-neutral-300">NFT #{idx}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
                  <p className="text-neutral-500 text-sm">No NFTs minted in this collection yet.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Post-Mint Success Modal Display */}
      {latestMintedNft && (
        <MintSuccessImage imageUrl={latestMintedNft} onClose={() => setLatestMintedNft(null)} />
      )}
    </div>
  );
}
