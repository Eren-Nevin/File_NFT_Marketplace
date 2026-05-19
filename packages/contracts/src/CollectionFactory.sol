// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { NFTCollection } from "./NFTCollection.sol";

interface IMarketplaceRegistrar {
    function registerCollection(address collection, uint16 platformFeeBps) external;
}

/// @title  CollectionFactory — deterministic EIP-1167 clones of NFTCollection
contract CollectionFactory is AccessControl {
    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");

    address public immutable implementation;
    address public immutable marketplace;
    address public immutable voucherSigner;

    event CollectionCreated(
        address indexed collection,
        address indexed admin,
        string name,
        string symbol,
        address royaltyReceiver,
        uint96 royaltyBps,
        uint16 platformFeeBps,
        bytes32 salt
    );

    constructor(address implementation_, address marketplace_, address voucherSigner_, address admin) {
        implementation = implementation_;
        marketplace = marketplace_;
        voucherSigner = voucherSigner_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DEPLOYER_ROLE, admin);
    }

    /// @notice Deploy a new NFTCollection clone, initialise it, and register it
    ///         with the marketplace. Caller becomes the clone's `DEFAULT_ADMIN_ROLE`.
    function createCollection(
        string calldata name_,
        string calldata symbol_,
        address royaltyReceiver,
        uint96 royaltyBps,
        uint16 platformFeeBps,
        bytes32 salt
    ) external onlyRole(DEPLOYER_ROLE) returns (address collection) {
        collection = Clones.cloneDeterministic(implementation, salt);
        NFTCollection(collection).initialize(
            name_, symbol_, msg.sender, voucherSigner, marketplace, royaltyReceiver, royaltyBps
        );
        IMarketplaceRegistrar(marketplace).registerCollection(collection, platformFeeBps);
        emit CollectionCreated(
            collection, msg.sender, name_, symbol_, royaltyReceiver, royaltyBps, platformFeeBps, salt
        );
    }

    function predictAddress(bytes32 salt) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, salt, address(this));
    }
}
