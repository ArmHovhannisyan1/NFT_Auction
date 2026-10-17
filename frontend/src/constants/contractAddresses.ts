interface ContractsConfig {
    [chainId: number]: {
        marketplace: string
        nftFactory: string
        mockUsdc: string
    }
}

export const chainToContract: ContractsConfig = {
    11155111: {
        marketplace: "0xf44ED197dFC90f081fC2900271eEF43C61CBa842",
        nftFactory: "0x7B943212C3358Dfe3510D0c5365593373F83d817",
        mockUsdc: "0x58023eA7a918CD599e8a94B743829438a8bFcFC0",
    },
}
