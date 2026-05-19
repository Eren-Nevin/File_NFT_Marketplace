// Event-only ABIs. Keep these in sync with packages/contracts/src/*.sol.
// Only the events the indexer subscribes to are listed.

export const FACTORY_EVENTS_ABI = [
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
    anonymous: false,
  },
] as const;

export const MARKETPLACE_EVENTS_ABI = [
  {
    type: 'event',
    name: 'PrimarySale',
    inputs: [
      { name: 'voucherHash', type: 'bytes32', indexed: true },
      { name: 'collection', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'totalPaid', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Listed',
    inputs: [
      { name: 'listingId', type: 'bytes32', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'collection', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'pricePerUnit', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Cancelled',
    inputs: [{ name: 'listingId', type: 'bytes32', indexed: true }],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SecondarySale',
    inputs: [
      { name: 'listingId', type: 'bytes32', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'collection', type: 'address', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'totalPaid', type: 'uint256', indexed: false },
      { name: 'royaltyAmount', type: 'uint256', indexed: false },
      { name: 'platformFee', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const ERC1155_EVENTS_ABI = [
  {
    type: 'event',
    name: 'TransferSingle',
    inputs: [
      { name: 'operator', type: 'address', indexed: true },
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'id', type: 'uint256', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;
