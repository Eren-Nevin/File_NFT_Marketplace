import {
  encodeAbiParameters,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from 'viem';
import { LAZY_VOUCHER_TYPES, marketplaceDomain, type LazyVoucher } from '@nftm/shared/eip712';
import type { Deps } from '../deps.js';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';

export async function signLazyVoucher(deps: Deps, voucher: LazyVoucher): Promise<Hex> {
  if (!deps.voucherSigner || !deps.voucherSigner.account) {
    throw new ApiError(ERROR_CODES.INTERNAL, 'VOUCHER_SIGNER_PRIVATE_KEY not configured', 500);
  }
  if (!deps.env.MARKETPLACE_ADDRESS) {
    throw new ApiError(ERROR_CODES.INTERNAL, 'MARKETPLACE_ADDRESS not configured', 500);
  }
  const domain = marketplaceDomain(deps.env.CHAIN_ID, deps.env.MARKETPLACE_ADDRESS);
  return deps.voucherSigner.signTypedData({
    account: deps.voucherSigner.account,
    domain,
    types: LAZY_VOUCHER_TYPES,
    primaryType: 'LazyVoucher',
    message: voucher,
  });
}

export function voucherSignerAddress(deps: Deps): Address {
  if (!deps.voucherSigner?.account) {
    throw new ApiError(ERROR_CODES.INTERNAL, 'voucher signer not loaded', 500);
  }
  return deps.voucherSigner.account.address;
}

const LAZY_VOUCHER_TYPEHASH = keccak256(
  stringToBytes(
    'LazyVoucher(address collection,uint256 tokenId,uint256 maxAmount,uint256 pricePerUnit,string tokenURI,uint256 expiresAt,uint256 nonce)',
  ),
);

/** Struct hash (NOT the EIP-712 digest). Must match `Marketplace.hashVoucher`. */
export function structHash(voucher: LazyVoucher): Hex {
  const tokenUriHash = keccak256(stringToBytes(voucher.tokenURI));
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'uint256' },
      ],
      [
        LAZY_VOUCHER_TYPEHASH,
        voucher.collection,
        voucher.tokenId,
        voucher.maxAmount,
        voucher.pricePerUnit,
        tokenUriHash,
        voucher.expiresAt,
        voucher.nonce,
      ],
    ),
  );
}
