//SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract Marketplace is ReentrancyGuard, Pausable {
    enum AuctionState {
        LISTED,
        ACTIVE,
        FINALIZED
    }

    struct AuctionData {
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 startingPrice;
        address highestBidder;
        uint256 highestBid;
        uint256 startTime;
        uint256 deadline;
        AuctionState auctionState;
    }

    address private immutable I_OWNER;
    uint256 private constant DURATION = 1 minutes;
    IERC20 public usdc;
    mapping(address => mapping(uint256 => AuctionData)) public idToAuction;

    event Marketplace__NFTIsListed(address indexed user, uint256 price, uint256 tId);
    event Marketplace__BidIsPlaced(address indexed bidder, uint256 amount);
    event Marketplace__AuctionIsFinalized(address indexed winner, uint256 amount);
    event Marketplace__ListingIsCanceled(address indexed canceler, address indexed nftContract, uint256 tId);

    error Marketplace__NotTheOwner();
    // listNFT()
    error Marketplace__AlreadyListed(address seller);
    error Marketplace__PriceIsLow(uint256 price);

    // placeBid()
    error Marketplace__LowBidAmount(address bidder, uint256 bid);
    error Marketplace__SellerCannotBid(address seller);
    error Marketplace__SellerDoesNotExist(address seller);
    error Marketplace__TimerIsOff(uint256 timeNow, uint256 deadline);

    // finalizeAuction()
    error Marketplace__AuctionAlreadyFinalized();
    error Marketplace__StillGotTime();
    error Marketplace__AuctionIsNotActive();

    // cancelListing()
    error Marketplace__WrongListingState();
    error Marketplace__OnlySellerCanCancelListing(address seller);

    modifier onlyOwner() {
        if (msg.sender != I_OWNER) revert Marketplace__NotTheOwner();
        _;
    }

    constructor(IERC20 usdcMock, address owner) {
        usdc = usdcMock;
        I_OWNER = owner;
    }

    function listNFT(uint256 _startingPrice, address _nftContract, uint256 _tokenId) external whenNotPaused {
        AuctionData storage auctionData = idToAuction[_nftContract][_tokenId];

        if (auctionData.seller != address(0)) revert Marketplace__AlreadyListed(auctionData.seller);
        if (_startingPrice == 0) revert Marketplace__PriceIsLow(_startingPrice);

        auctionData.startingPrice = _startingPrice;
        auctionData.seller = msg.sender;
        auctionData.nftContract = _nftContract;
        auctionData.tokenId = _tokenId;
        auctionData.auctionState = AuctionState.LISTED;

        IERC721(_nftContract).transferFrom(msg.sender, address(this), _tokenId);
        emit Marketplace__NFTIsListed(msg.sender, _startingPrice, auctionData.tokenId);
    }

    function placeBid(uint256 bidAmount, address _nftContract, uint256 _tokenId) external nonReentrant whenNotPaused {
        AuctionData storage auctionData = idToAuction[_nftContract][_tokenId];

        if (auctionData.seller == address(0)) revert Marketplace__SellerDoesNotExist(auctionData.seller);

        if (auctionData.auctionState == AuctionState.FINALIZED) revert Marketplace__AuctionAlreadyFinalized();

        if (bidAmount <= auctionData.highestBid || bidAmount <= auctionData.startingPrice) {
            revert Marketplace__LowBidAmount(msg.sender, bidAmount);
        }

        if (auctionData.seller == msg.sender) revert Marketplace__SellerCannotBid(msg.sender);

        if (auctionData.startTime == 0) {
            auctionData.startTime = block.timestamp;
            auctionData.deadline = block.timestamp + DURATION;
        }

        if (block.timestamp > auctionData.deadline) {
            revert Marketplace__TimerIsOff(block.timestamp, auctionData.deadline);
        }

        /////////////////////////////// INTERESTING CASE !!!! ////////////////////////////////////

        // CEI (Checks, Effects, Interactions), this piece of code was violating the pattern (CEI)
        // The code
        /*
            if (auctionData.highestBidder != address(0)) {
                usdc.transfer(auctionData.highestBidder, auctionData.highestBid);
            }

            auctionData.auctionState = AuctionState.ACTIVE;
            auctionData.highestBid = bidAmount;
            auctionData.highestBidder = msg.sender;
        */
        // We had a problem, because Interaction was before Effect, not after as we see in CEI
        // But if we switched places wrong tx would happen
        // So we stored the highestBidder, highestBid in a local variable, switched places, in the tx put the prevBidder, prevBid

        address prevBidder = auctionData.highestBidder;
        uint256 prevBid = auctionData.highestBid;

        auctionData.auctionState = AuctionState.ACTIVE;
        auctionData.highestBid = bidAmount;
        auctionData.highestBidder = msg.sender;

        if (prevBidder != address(0)) {
            usdc.transfer(prevBidder, prevBid);
        }

        usdc.transferFrom(msg.sender, address(this), bidAmount);
        emit Marketplace__BidIsPlaced(msg.sender, bidAmount);
    }

    function finalizeAuction(address _nftContract, uint256 _tokenId) external nonReentrant whenNotPaused {
        AuctionData storage auctionData = idToAuction[_nftContract][_tokenId];

        if (auctionData.seller == address(0)) revert Marketplace__SellerDoesNotExist(auctionData.seller);
        if (auctionData.auctionState == AuctionState.FINALIZED) revert Marketplace__AuctionAlreadyFinalized();
        if (block.timestamp < auctionData.deadline) revert Marketplace__StillGotTime();
        if (auctionData.auctionState != AuctionState.ACTIVE) revert Marketplace__AuctionIsNotActive();

        auctionData.auctionState = AuctionState.FINALIZED;

        usdc.transfer(auctionData.seller, auctionData.highestBid);
        IERC721(_nftContract).transferFrom(address(this), auctionData.highestBidder, _tokenId);

        emit Marketplace__AuctionIsFinalized(msg.sender, auctionData.highestBid);
    }

    function cancelListing(address _nftContract, uint256 _tokenId) external {
        AuctionData storage auctionData = idToAuction[_nftContract][_tokenId];

        if (auctionData.seller == address(0)) revert Marketplace__SellerDoesNotExist(msg.sender);
        if (auctionData.seller != msg.sender) revert Marketplace__OnlySellerCanCancelListing(msg.sender);
        if (auctionData.auctionState != AuctionState.LISTED) revert Marketplace__WrongListingState();

        delete idToAuction[_nftContract][_tokenId];

        IERC721(_nftContract).transferFrom(address(this), msg.sender, _tokenId);

        emit Marketplace__ListingIsCanceled(msg.sender, _nftContract, _tokenId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setUSDCAddress(IERC20 _usdc) external onlyOwner {
        usdc = _usdc;
    }

    function getIdToAuction(address _nftContract, uint256 _tokenId) public view returns (AuctionData memory) {
        return idToAuction[_nftContract][_tokenId];
    }

    function getOwner() public view returns (address) {
        return I_OWNER;
    }

    function getDuration() public pure returns (uint256) {
        return DURATION;
    }
}
