// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { NFTCollection } from "../src/NFTCollection.sol";
import { CollectionFactory } from "../src/CollectionFactory.sol";
import { Marketplace } from "../src/Marketplace.sol";

/// @notice Deploys NFTCollection (implementation), Marketplace, CollectionFactory,
///         and wires REGISTRAR_ROLE on the marketplace to the factory.
/// @dev    Env: SUPER_ADMIN_PRIVATE_KEY, USDC_ADDRESS, TREASURY_ADDRESS,
///         VOUCHER_SIGNER_ADDRESS.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("SUPER_ADMIN_PRIVATE_KEY");
        address admin = vm.addr(pk);
        address usdc = vm.envAddress("USDC_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address voucherSigner = vm.envAddress("VOUCHER_SIGNER_ADDRESS");

        vm.startBroadcast(pk);

        NFTCollection impl = new NFTCollection();
        Marketplace market = new Marketplace(IERC20(usdc), treasury, admin);
        CollectionFactory factory =
            new CollectionFactory(address(impl), address(market), voucherSigner, admin);

        market.grantRole(market.REGISTRAR_ROLE(), address(factory));

        vm.stopBroadcast();

        string memory out = string.concat(
            "{",
            '"chainId":', vm.toString(block.chainid), ',',
            '"admin":"', vm.toString(admin), '",',
            '"usdc":"', vm.toString(usdc), '",',
            '"treasury":"', vm.toString(treasury), '",',
            '"voucherSigner":"', vm.toString(voucherSigner), '",',
            '"nftCollectionImplementation":"', vm.toString(address(impl)), '",',
            '"marketplace":"', vm.toString(address(market)), '",',
            '"factory":"', vm.toString(address(factory)), '"',
            "}"
        );
        vm.writeFile(
            string.concat("deployments/", vm.toString(block.chainid), ".json"), out
        );
    }
}
