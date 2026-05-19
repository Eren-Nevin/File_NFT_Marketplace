// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import { MockUSDC } from "./mocks/MockUSDC.sol";
import { NFTCollection } from "../src/NFTCollection.sol";
import { CollectionFactory } from "../src/CollectionFactory.sol";
import { Marketplace } from "../src/Marketplace.sol";

contract MarketplaceTest is Test {
    MockUSDC internal usdc;
    NFTCollection internal implementation;
    Marketplace internal market;
    CollectionFactory internal factory;
    NFTCollection internal collection;

    address internal admin = address(0xA11CE);
    address internal treasury = address(0xC0FFEE);
    address internal royaltyReceiver = address(0xBEEF);
    address internal voucherSigner;
    uint256 internal voucherSignerPk;
    address internal buyer = address(0xB0B);
    address internal buyer2 = address(0xB0B2);

    uint16 internal constant ROYALTY_BPS = 500; // 5%
    uint16 internal constant PLATFORM_FEE_BPS = 250; // 2.5%

    function setUp() public {
        (voucherSigner, voucherSignerPk) = makeAddrAndKey("voucher-signer");

        usdc = new MockUSDC();
        implementation = new NFTCollection();
        market = new Marketplace(usdc, treasury, admin);
        factory = new CollectionFactory(address(implementation), address(market), voucherSigner, admin);

        // Marketplace must let the factory auto-register new collections.
        // Note: cache the role value before pranking — Solidity evaluates view
        // calls inside the args first, which would consume the prank.
        bytes32 registrarRole = market.REGISTRAR_ROLE();

        vm.startPrank(admin);
        market.grantRole(registrarRole, address(factory));
        collection = NFTCollection(
            factory.createCollection(
                "Genesis", "GEN", royaltyReceiver, ROYALTY_BPS, PLATFORM_FEE_BPS, bytes32(uint256(1))
            )
        );
        vm.stopPrank();

        usdc.mint(buyer, 1_000_000e6);
        usdc.mint(buyer2, 1_000_000e6);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    function _signVoucher(Marketplace.LazyVoucher memory v) internal view returns (bytes memory) {
        bytes32 typedHash = keccak256(
            abi.encode(
                market.LAZY_VOUCHER_TYPEHASH(),
                v.collection,
                v.tokenId,
                v.maxAmount,
                v.pricePerUnit,
                keccak256(bytes(v.tokenURI)),
                v.expiresAt,
                v.nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", market.domainSeparator(), typedHash));
        (uint8 v0, bytes32 r, bytes32 s) = vm.sign(voucherSignerPk, digest);
        return abi.encodePacked(r, s, v0);
    }

    function _makeVoucher(uint256 tokenId, uint256 pricePerUnit, uint256 maxAmount)
        internal
        view
        returns (Marketplace.LazyVoucher memory)
    {
        return Marketplace.LazyVoucher({
            collection: address(collection),
            tokenId: tokenId,
            maxAmount: maxAmount,
            pricePerUnit: pricePerUnit,
            tokenURI: "ipfs://QmTestMetadataCid",
            expiresAt: block.timestamp + 1 days,
            nonce: 1
        });
    }

    // ─── Primary ────────────────────────────────────────────────────────────

    function test_PrimaryBuyMintsAndPays() public {
        Marketplace.LazyVoucher memory v = _makeVoucher(1, 10e6, 5);
        bytes memory sig = _signVoucher(v);

        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        market.buyVoucher(v, sig, 2);

        assertEq(collection.balanceOf(buyer, 1), 2);
        assertEq(collection.totalSupply(1), 2);
        assertEq(collection.maxSupply(1), 5);
        assertEq(collection.uri(1), "ipfs://QmTestMetadataCid");
        assertEq(usdc.balanceOf(treasury), 20e6);
    }

    function test_PrimaryRevertsWhenSignerLacksRole() public {
        Marketplace.LazyVoucher memory v = _makeVoucher(2, 1e6, 1);

        // Sign with a different key
        (, uint256 stranger) = makeAddrAndKey("stranger");
        bytes32 typedHash = keccak256(
            abi.encode(
                market.LAZY_VOUCHER_TYPEHASH(),
                v.collection,
                v.tokenId,
                v.maxAmount,
                v.pricePerUnit,
                keccak256(bytes(v.tokenURI)),
                v.expiresAt,
                v.nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", market.domainSeparator(), typedHash));
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(stranger, digest);
        bytes memory sig = abi.encodePacked(r, s, vv);

        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        vm.expectRevert(Marketplace.VoucherSignerLacksRole.selector);
        market.buyVoucher(v, sig, 1);
    }

    function test_PrimaryRevertsWhenExpired() public {
        Marketplace.LazyVoucher memory v = _makeVoucher(3, 1e6, 1);
        v.expiresAt = block.timestamp - 1;
        bytes memory sig = _signVoucher(v);

        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        vm.expectRevert(Marketplace.VoucherExpired.selector);
        market.buyVoucher(v, sig, 1);
    }

    function test_PrimaryRevertsWhenExhausted() public {
        Marketplace.LazyVoucher memory v = _makeVoucher(4, 1e6, 2);
        bytes memory sig = _signVoucher(v);

        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        market.buyVoucher(v, sig, 2);

        vm.prank(buyer);
        vm.expectRevert(Marketplace.VoucherExhausted.selector);
        market.buyVoucher(v, sig, 1);
    }

    function test_PrimaryRevertsWhenRevoked() public {
        Marketplace.LazyVoucher memory v = _makeVoucher(5, 1e6, 5);
        bytes memory sig = _signVoucher(v);
        bytes32 vh = market.hashVoucher(v);

        vm.prank(admin);
        market.revokeVoucher(vh);

        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        vm.expectRevert(Marketplace.VoucherExhausted.selector);
        market.buyVoucher(v, sig, 1);
    }

    // ─── Secondary ──────────────────────────────────────────────────────────

    function _primaryMintForBuyer(uint256 tokenId, uint256 price, uint256 amount) internal {
        Marketplace.LazyVoucher memory v = _makeVoucher(tokenId, price, amount);
        bytes memory sig = _signVoucher(v);
        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        market.buyVoucher(v, sig, amount);
    }

    function test_SecondaryListAndBuySplitsFees() public {
        _primaryMintForBuyer(10, 100e6, 1);

        vm.prank(buyer);
        collection.setApprovalForAll(address(market), true);

        vm.prank(buyer);
        bytes32 lid = market.list(address(collection), 10, 1, 200e6);

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 royaltyBefore = usdc.balanceOf(royaltyReceiver);
        uint256 sellerBefore = usdc.balanceOf(buyer);

        vm.prank(buyer2);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer2);
        market.buy(lid, 1);

        // royalty = 5% of 200 = 10, platform fee = 2.5% of 200 = 5, seller = 185
        assertEq(usdc.balanceOf(royaltyReceiver) - royaltyBefore, 10e6);
        assertEq(usdc.balanceOf(treasury) - treasuryBefore, 5e6);
        assertEq(usdc.balanceOf(buyer) - sellerBefore, 185e6);
        assertEq(collection.balanceOf(buyer2, 10), 1);
        assertEq(collection.balanceOf(buyer, 10), 0);
    }

    function test_SecondaryCancelByNonSellerReverts() public {
        _primaryMintForBuyer(11, 1e6, 1);
        vm.prank(buyer);
        collection.setApprovalForAll(address(market), true);
        vm.prank(buyer);
        bytes32 lid = market.list(address(collection), 11, 1, 1e6);

        vm.prank(buyer2);
        vm.expectRevert(Marketplace.NotListingSeller.selector);
        market.cancelListing(lid);
    }

    function test_SecondaryCancelDeactivates() public {
        _primaryMintForBuyer(12, 1e6, 1);
        vm.prank(buyer);
        collection.setApprovalForAll(address(market), true);
        vm.prank(buyer);
        bytes32 lid = market.list(address(collection), 12, 1, 1e6);

        vm.prank(buyer);
        market.cancelListing(lid);

        vm.prank(buyer2);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer2);
        vm.expectRevert(Marketplace.ListingInactive.selector);
        market.buy(lid, 1);
    }

    // ─── Pause ──────────────────────────────────────────────────────────────

    function test_PauseBlocksPrimary() public {
        vm.prank(admin);
        market.pause();

        Marketplace.LazyVoucher memory v = _makeVoucher(20, 1e6, 1);
        bytes memory sig = _signVoucher(v);
        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        vm.expectRevert(); // Pausable: paused
        market.buyVoucher(v, sig, 1);
    }
}
