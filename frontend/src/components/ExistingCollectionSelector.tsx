type ExistingCollectionSelectorProps = {
  collections: readonly `0x${string}`[] | string[]; // array of collection addresses or names
  onSelect: (address: string) => void;
  value: string;
  name: string;
  symbol: string;
};

export function ExistingCollectionSelector({
  collections,
  onSelect,
  value, name, symbol
}: ExistingCollectionSelectorProps) {
  return (
    <div className="border p-4 rounded">
      <h3 className="text-lg font-medium">Select Existing Collection</h3>
      <select
        className="mt-2 w-full border px-2 py-1 rounded"
        value={value}
        onChange={e => onSelect(e.target.value)}
      >
        <option value="">-- Choose Collection --</option>
        {collections.map(addr => (
          <option className='text-black' key={addr} value={addr}>{addr}</option>
        ))}
      </select>
      <p>Collection Name: {name}</p>
      <p>Collection Symbol: {symbol}</p>
    </div>
  );
}
