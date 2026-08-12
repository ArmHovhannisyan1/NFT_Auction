import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ConnectWalletButton() {
  return (
    <div className="flex justify-end p-4">
      {/* RainbowKit connect button handles all wallet logic */}
      <ConnectButton />
    </div>
  );
}
