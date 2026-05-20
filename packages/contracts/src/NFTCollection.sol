// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ERC1155Upgradeable } from
    "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import { ERC2981Upgradeable } from
    "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import { AccessControlUpgradeable } from
    "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { PausableUpgradeable } from
    "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title  NFTCollection — clonable ERC-1155 + EIP-2981 with per-token URI
/// @notice Each clone is one "drop". Tokens are minted exclusively through the
///         marketplace contract (`MARKETPLACE_ROLE`); off-chain admin signs
///         lazy-mint vouchers with the address that holds `MINTER_ROLE`.
contract NFTCollection is
    Initializable,
    ERC1155Upgradeable,
    ERC2981Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    string public name;
    string public symbol;

    /// @notice Per-token metadata URI (overrides default ERC-1155 base URI).
    mapping(uint256 tokenId => string) private _tokenURIs;
    /// @notice Per-token total minted. URI + maxSupply lock once nonzero.
    mapping(uint256 tokenId => uint256) public totalSupply;
    /// @notice Per-token max supply, set on the first lazy mint of that id.
    mapping(uint256 tokenId => uint256) public maxSupply;

    event TokenInitialized(uint256 indexed tokenId, uint256 maxSupply, string tokenURI);

    error TokenIdNotInitialized();
    error MaxSupplyMismatch();
    error MaxSupplyExceeded();
    error AmountZero();

    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata name_,
        string calldata symbol_,
        address admin,
        address minter,
        address marketplace,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external initializer {
        __ERC1155_init("");
        __ERC2981_init();
        __AccessControl_init();
        __Pausable_init();

        name = name_;
        symbol = symbol_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(MARKETPLACE_ROLE, marketplace);

        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
    }

    // ─── Minting ────────────────────────────────────────────────────────────

    /// @notice Mint `amount` of `tokenId` to `to`. Only callable by the marketplace.
    ///         The first call for a given `tokenId` initialises the URI and max supply.
    function lazyMint(
        uint256 tokenId,
        address to,
        uint256 amount,
        uint256 maxSupply_,
        string calldata tokenURI_
    ) external whenNotPaused onlyRole(MARKETPLACE_ROLE) {
        if (amount == 0) revert AmountZero();

        uint256 supply = totalSupply[tokenId];
        if (supply == 0) {
            _tokenURIs[tokenId] = tokenURI_;
            maxSupply[tokenId] = maxSupply_;
            emit TokenInitialized(tokenId, maxSupply_, tokenURI_);
            // ERC-1155 standard event — indexers (BaseScan, OpenSea, wallets)
            // listen for this to know when to fetch/cache token metadata.
            // Without it the token shows up with no image on explorers.
            emit URI(tokenURI_, tokenId);
        } else {
            if (maxSupply[tokenId] != maxSupply_) revert MaxSupplyMismatch();
        }

        if (supply + amount > maxSupply_) revert MaxSupplyExceeded();
        totalSupply[tokenId] = supply + amount;
        _mint(to, tokenId, amount, "");
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    function setDefaultRoyalty(address receiver, uint96 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, bps);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory u = _tokenURIs[tokenId];
        if (bytes(u).length == 0) revert TokenIdNotInitialized();
        return u;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, ERC2981Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─── Hooks ──────────────────────────────────────────────────────────────

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, ids, values);
    }
}
