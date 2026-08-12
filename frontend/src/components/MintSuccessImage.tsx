import React from 'react';

type MintSuccessImageProps = {
  imageUrl: string;
  onClose: () => void;
};

export function MintSuccessImage({ imageUrl, onClose }: MintSuccessImageProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[4px] transition-opacity duration-300">
      <div className="relative flex flex-col items-center max-w-sm w-full mx-4 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow accent */}
        <div className="absolute -top-12 -z-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>

        <h3 className="text-xl font-bold text-white mb-1">🎉 Mint Successful!</h3>
        <p className="text-xs text-neutral-400 mb-4">Your 100% on-chain NFT is ready.</p>
        
        <div className="w-64 h-64 bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 shadow-inner">
          <img src={imageUrl} alt="Minted NFT preview" className="w-full h-full object-cover" />
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/20 active:scale-[0.98]"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
