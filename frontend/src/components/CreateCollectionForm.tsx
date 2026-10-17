import { useState } from 'react';

type CreateCollectionFormProps = {
  onCreate: (name: string, symbol: string) => void;
};

export function CreateCollectionForm({ onCreate }: CreateCollectionFormProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  return (
    <div className="border p-4 rounded">
      <h3 className="text-lg font-medium">Create New Collection</h3>
      <div className="mt-2 space-y-2">
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          placeholder="Collection Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          placeholder="Symbol (e.g., NFT)"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
        />
        <button
          onClick={() => onCreate(name, symbol)}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={!name || !symbol}
        >
          Create Collection
        </button>
      </div>
    </div>
  );
}
