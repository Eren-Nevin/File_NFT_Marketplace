export const FACTORY_ABI = [
  {
    type: 'function',
    name: 'createCollection',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name_', type: 'string' },
      { name: 'symbol_', type: 'string' },
      { name: 'royaltyReceiver', type: 'address' },
      { name: 'royaltyBps', type: 'uint96' },
      { name: 'platformFeeBps', type: 'uint16' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ name: 'collection', type: 'address' }],
  },
  {
    type: 'event',
    name: 'CollectionCreated',
    inputs: [
      { name: 'collection', type: 'address', indexed: true },
      { name: 'admin', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false },
      { name: 'royaltyReceiver', type: 'address', indexed: false },
      { name: 'royaltyBps', type: 'uint96', indexed: false },
      { name: 'platformFeeBps', type: 'uint16', indexed: false },
      { name: 'salt', type: 'bytes32', indexed: false },
    ],
  },
] as const;
