type MintNftButtonProps = {
  onMint: () => void;
  disabled?: boolean;
};

export function MintNftButton({ onMint, disabled }: MintNftButtonProps) {
  return (
    <div className="mt-4">
      <button
        onClick={onMint}
        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={disabled}
      >
        Mint NFT
      </button>
    </div>
  );
}
