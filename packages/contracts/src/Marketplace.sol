// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { IERC2981 } from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { NFTCollection } from "./NFTCollection.sol";

/// @title  Marketplace — USDC fixed-price marketplace for NFTCollection clones
/// @notice Primary sales: admin signs an EIP-712 LazyVoucher off-chain; buyer
///         pays USDC, contract verifies signature and lazy-mints to buyer.
///         Secondary sales: holders list owned tokens; on buy, royalty +
///         platform fee are split, remainder goes to seller.
contract Marketplace is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    bytes32 public constant LAZY_VOUCHER_TYPEHASH = keccak256(
        "LazyVoucher(address collection,uint256 tokenId,uint256 maxAmount,uint256 pricePerUnit,string tokenURI,uint256 expiresAt,uint256 nonce)"
    );

    uint16 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable USDC;

    address public treasury;
    mapping(address collection => uint16) public platformFeeBps;
    mapping(address collection => bool) public registeredCollection;

    /// @dev Per-voucher amount consumed (keyed by EIP-712 struct hash).
    mapping(bytes32 voucherHash => uint256) public voucherAmountUsed;
    /// @dev Super-admin can revoke a voucher (exhausts it permanently).
    mapping(bytes32 voucherHash => bool) public voucherRevoked;

    struct Listing {
        address seller;
        address collection;
        uint256 tokenId;
        uint256 amountRemaining;
        uint256 pricePerUnit;
        bool active;
    }

    mapping(bytes32 listingId => Listing) public listings;
    mapping(address seller => uint256) public listingNonce;

    struct LazyVoucher {
        address collection;
        uint256 tokenId;
        uint256 maxAmount;
        uint256 pricePerUnit;
        string tokenURI;
        uint256 expiresAt;
        uint256 nonce;
    }

    event CollectionRegistered(address indexed collection, uint16 platformFeeBps);
    event PlatformFeeBpsUpdated(address indexed collection, uint16 oldBps, uint16 newBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event VoucherRevoked(bytes32 indexed voucherHash);

    event PrimarySale(
        bytes32 indexed voucherHash,
        address indexed collection,
        uint256 indexed tokenId,
        address buyer,
        uint256 amount,
        uint256 totalPaid
    );

    event Listed(
        bytes32 indexed listingId,
        address indexed seller,
        address indexed collection,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit
    );
    event Cancelled(bytes32 indexed listingId);
    event SecondarySale(
        bytes32 indexed listingId,
        address indexed buyer,
        address indexed seller,
        address collection,
        uint256 tokenId,
        uint256 amount,
        uint256 totalPaid,
        uint256 royaltyAmount,
        uint256 platformFee
    );

    error CollectionNotRegistered();
    error VoucherExpired();
    error VoucherExhausted();
    error VoucherSignatureInvalid();
    error VoucherSignerLacksRole();
    error AmountZero();
    error ListingInactive();
    error ListingAmountExceeded();
    error NotListingSeller();
    error FeesExceedTotal();
    error PlatformFeeTooHigh();

    constructor(IERC20 usdc, address treasury_, address admin)
        EIP712("NftmMarketplace", "1")
    {
        USDC = usdc;
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        emit TreasuryUpdated(address(0), treasury_);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    function registerCollection(address collection, uint16 bps) external onlyRole(REGISTRAR_ROLE) {
        if (bps > 1000) revert PlatformFeeTooHigh(); // hard ceiling: 10%
        registeredCollection[collection] = true;
        platformFeeBps[collection] = bps;
        emit CollectionRegistered(collection, bps);
    }

    function setPlatformFeeBps(address collection, uint16 bps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (bps > 1000) revert PlatformFeeTooHigh();
        if (!registeredCollection[collection]) revert CollectionNotRegistered();
        uint16 old = platformFeeBps[collection];
        platformFeeBps[collection] = bps;
        emit PlatformFeeBpsUpdated(collection, old, bps);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function revokeVoucher(bytes32 voucherHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        voucherRevoked[voucherHash] = true;
        emit VoucherRevoked(voucherHash);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ─── Primary (lazy mint) ────────────────────────────────────────────────

    function hashVoucher(LazyVoucher calldata v) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                LAZY_VOUCHER_TYPEHASH,
                v.collection,
                v.tokenId,
                v.maxAmount,
                v.pricePerUnit,
                keccak256(bytes(v.tokenURI)),
                v.expiresAt,
                v.nonce
            )
        );
    }

    function digestVoucher(LazyVoucher calldata v) public view returns (bytes32) {
        return _hashTypedDataV4(hashVoucher(v));
    }

    function buyVoucher(LazyVoucher calldata voucher, bytes calldata signature, uint256 amount)
        external
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert AmountZero();
        if (!registeredCollection[voucher.collection]) revert CollectionNotRegistered();
        if (block.timestamp > voucher.expiresAt) revert VoucherExpired();

        bytes32 voucherHash = hashVoucher(voucher);
        if (voucherRevoked[voucherHash]) revert VoucherExhausted();

        uint256 used = voucherAmountUsed[voucherHash];
        if (used + amount > voucher.maxAmount) revert VoucherExhausted();

        bytes32 digest = _hashTypedDataV4(voucherHash);
        address signer = ECDSA.recover(digest, signature);
        if (signer == address(0)) revert VoucherSignatureInvalid();
        if (!IAccessControl(voucher.collection).hasRole(NFTCollection(voucher.collection).MINTER_ROLE(), signer))
        {
            revert VoucherSignerLacksRole();
        }

        voucherAmountUsed[voucherHash] = used + amount;

        uint256 total = voucher.pricePerUnit * amount;
        if (total > 0) {
            USDC.safeTransferFrom(msg.sender, treasury, total);
        }

        NFTCollection(voucher.collection).lazyMint(
            voucher.tokenId, msg.sender, amount, voucher.maxAmount, voucher.tokenURI
        );

        emit PrimarySale(voucherHash, voucher.collection, voucher.tokenId, msg.sender, amount, total);
    }

    // ─── Secondary ──────────────────────────────────────────────────────────

    function list(address collection, uint256 tokenId, uint256 amount, uint256 pricePerUnit)
        external
        whenNotPaused
        nonReentrant
        returns (bytes32 listingId)
    {
        if (amount == 0) revert AmountZero();
        if (!registeredCollection[collection]) revert CollectionNotRegistered();

        // We don't require the seller to hold the balance here — they may list
        // and later acquire — but they must have set marketplace as operator.
        // Balance is checked at buy time.
        uint256 nonce = listingNonce[msg.sender]++;
        listingId = keccak256(abi.encode(msg.sender, collection, tokenId, nonce));

        listings[listingId] = Listing({
            seller: msg.sender,
            collection: collection,
            tokenId: tokenId,
            amountRemaining: amount,
            pricePerUnit: pricePerUnit,
            active: true
        });

        emit Listed(listingId, msg.sender, collection, tokenId, amount, pricePerUnit);
    }

    function cancelListing(bytes32 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert ListingInactive();
        if (l.seller != msg.sender) revert NotListingSeller();
        l.active = false;
        emit Cancelled(listingId);
    }

    function buy(bytes32 listingId, uint256 amount) external whenNotPaused nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert ListingInactive();
        if (amount == 0) revert AmountZero();
        if (amount > l.amountRemaining) revert ListingAmountExceeded();

        uint256 total = l.pricePerUnit * amount;

        (address royaltyReceiver, uint256 royaltyAmount) =
            IERC2981(l.collection).royaltyInfo(l.tokenId, total);

        uint256 fee = (total * platformFeeBps[l.collection]) / BPS_DENOMINATOR;
        if (royaltyAmount + fee > total) revert FeesExceedTotal();
        uint256 sellerProceeds = total - royaltyAmount - fee;

        // Pull total from buyer once, then distribute.
        if (total > 0) USDC.safeTransferFrom(msg.sender, address(this), total);
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            USDC.safeTransfer(royaltyReceiver, royaltyAmount);
        }
        if (fee > 0) USDC.safeTransfer(treasury, fee);
        if (sellerProceeds > 0) USDC.safeTransfer(l.seller, sellerProceeds);

        l.amountRemaining -= amount;
        if (l.amountRemaining == 0) l.active = false;

        IERC1155(l.collection).safeTransferFrom(l.seller, msg.sender, l.tokenId, amount, "");

        emit SecondarySale(
            listingId, msg.sender, l.seller, l.collection, l.tokenId, amount, total, royaltyAmount, fee
        );
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getListing(bytes32 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
