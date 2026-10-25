// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {DeployMarketplace} from "../script/DeployMarketplace.s.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {NftFactory} from "../src/NftFactory.sol";
import {CreateNft} from "../src/CreateNft.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ERC20Mock} from "../src/mock/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketplaceTest is Test {
    DeployMarketplace deployer;
    Marketplace market;
    NftFactory factory;
    ERC20Mock mockUsdc;

    string name = "ARMAN";
    string symbol = "ARM";
    uint256 constant startingPrice = 10e6;
    uint256 constant bidAmount = 11e6;
    address user = makeAddr("user");
    address seller = makeAddr("seller");
    address nftContract;
    uint256 tokenId;

    function setUp() external {
        deployer = new DeployMarketplace();
        market = deployer.run();
        factory = new NftFactory();
        mockUsdc = ERC20Mock(address(market.usdc()));
    }

    function mintAndApprove() internal {
        nftContract = factory.createCollection(name, symbol);
        tokenId = CreateNft(nftContract).getTokenCounter();
        CreateNft(nftContract).mintNft();
        IERC721(nftContract).approve(address(market), tokenId);
    }

    //// LIST NFT FUNCTION TESTS

    function testNFTIsListed() public {
        vm.startPrank(user);
        mintAndApprove();
        vm.expectEmit(true, true, true, true);
        emit Marketplace.Marketplace__NFTIsListed(nftContract, tokenId, user, startingPrice);
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();
    }

    function testNFTAlreadyListed() public {
        vm.startPrank(user);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.Marketplace__AlreadyListed.selector, user));
        market.listNFT(startingPrice, nftContract, tokenId);
    }

    function testLowStartingPrice() public {
        vm.startPrank(user);
        mintAndApprove();
        vm.expectRevert(abi.encodeWithSelector(Marketplace.Marketplace__PriceIsLow.selector, 0));
        market.listNFT(0, nftContract, tokenId);
        vm.stopPrank();
    }

    function testDataIsSavedCorrectlyAfterListNFT() public {
        vm.startPrank(user);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        Marketplace.AuctionData memory auctionData = market.getIdToAuction(nftContract, tokenId);

        assertEq(auctionData.seller, user);
        assertEq(auctionData.startingPrice, startingPrice);
        assertEq(auctionData.nftContract, nftContract);
        assertEq(auctionData.tokenId, tokenId);
        assertEq(auctionData.highestBidder, address(0));
        assertEq(auctionData.highestBid, 0);
        assertEq(auctionData.startTime, 0);
        assertEq(auctionData.deadline, 0);
        assertEq(uint256(auctionData.auctionState), 0);
    }

    function testNFTIsTransferedCorrectly() public {
        vm.startPrank(user);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        assertEq(IERC721(nftContract).balanceOf(user), 0);
        assertEq(IERC721(nftContract).balanceOf(address(market)), 1);
    }

    function testListNFTYouDontOwn() public {
        vm.startPrank(user);
        mintAndApprove();
        vm.stopPrank();

        address otherUser = makeAddr("otherUser");

        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721IncorrectOwner.selector, otherUser, tokenId, user));
        market.listNFT(startingPrice, nftContract, tokenId);
    }

    function testListingRevertWhenPaused() public {
        vm.prank(market.getOwner());
        market.pause();

        vm.startPrank(user);
        mintAndApprove();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();
    }

    function testListingNotRevertWhenUnPaused() public {
        vm.startPrank(market.getOwner());
        market.pause();
        market.unpause();
        vm.stopPrank();

        vm.startPrank(user);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();
    }

    function testSetUSDCAddress() public {
        address newAddr = makeAddr("newAddr");
        market.setUSDCAddress(IERC20(newAddr));
        assertEq(newAddr, address(market.usdc()));
    }

    function testOnlyOwnerSetUSDCAddress() public {
        vm.prank(user);
        vm.expectRevert(Marketplace.Marketplace__NotTheOwner.selector);
        market.setUSDCAddress(mockUsdc);
        assertEq(address(mockUsdc), address(market.usdc()));
    }

    /////// PLACE BID FUNCTION TEST

    function testBidIsPlaced() public {
        // List the NFT
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        // Place a bid
        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        vm.expectEmit(true, false, false, true);
        emit Marketplace.Marketplace__BidIsPlaced(nftContract, tokenId, user, bidAmount);
        uint256 timestamp = block.timestamp;
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();

        Marketplace.AuctionData memory auctionData = market.getIdToAuction(nftContract, tokenId);

        assertEq(auctionData.highestBidder, user);
        assertEq(auctionData.highestBid, bidAmount);
        assertEq(uint256(auctionData.auctionState), 1);
        assertEq(auctionData.deadline, timestamp + market.getDuration());
        assertEq(mockUsdc.balanceOf(user), 0);
        assertEq(mockUsdc.balanceOf(address(market)), bidAmount);
    }

    function testSellerDoesNotExist() public {
        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__SellerDoesNotExist.selector, market.getIdToAuction(nftContract, tokenId).seller
            )
        );
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();
    }

    function testLowBidAmount() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.Marketplace__LowBidAmount.selector, user, startingPrice - 1));
        market.placeBid(startingPrice - 1, nftContract, tokenId);
        vm.stopPrank();
    }

    function testSellerCannotBid() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(seller);
        mockUsdc.mint(seller, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.Marketplace__SellerCannotBid.selector, seller));
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();
    }

    function testTimerIsOff() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();
        vm.warp(block.timestamp + market.getDuration() + 1);
        vm.roll(block.number + 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__TimerIsOff.selector,
                block.timestamp,
                market.getIdToAuction(nftContract, tokenId).deadline
            )
        );
        vm.prank(user);
        market.placeBid(bidAmount + 1, nftContract, tokenId);
    }

    function testPlaceBidTwoTimes() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();

        assertEq(mockUsdc.balanceOf(address(market)), market.getIdToAuction(nftContract, tokenId).highestBid);
        assertEq(
            mockUsdc.balanceOf(user), mockUsdc.balanceOf(market.getIdToAuction(nftContract, tokenId).highestBidder)
        );

        uint256 prevBid = market.getIdToAuction(nftContract, tokenId).highestBid;

        address user2 = makeAddr("user2");
        uint256 newBidAmount = bidAmount + 5e6;
        vm.startPrank(user2);
        mockUsdc.mint(user2, newBidAmount);
        mockUsdc.approve(address(market), newBidAmount);
        market.placeBid(newBidAmount, nftContract, tokenId);
        vm.stopPrank();

        assertEq(mockUsdc.balanceOf(address(market)), market.getIdToAuction(nftContract, tokenId).highestBid);
        assertEq(
            mockUsdc.balanceOf(user2), mockUsdc.balanceOf(market.getIdToAuction(nftContract, tokenId).highestBidder)
        );
        assertEq(mockUsdc.balanceOf(user), prevBid);
    }

    function testSellerDoesNotExistWhenPlacingBid() public {
        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__SellerDoesNotExist.selector, market.getIdToAuction(nftContract, tokenId).seller
            )
        );
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();
    }

    /////// FINALIZE AUCTION FUNCTION TEST

    function testAuctionIsFinalized() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        vm.warp(block.timestamp + 60);
        vm.roll(block.number + 1);
        vm.expectEmit(true, false, false, true);
        emit Marketplace.Marketplace__AuctionIsFinalized(
            nftContract, tokenId, user, market.getIdToAuction(nftContract, tokenId).highestBid
        );
        market.finalizeAuction(nftContract, tokenId);
        vm.stopPrank();

        assertEq(uint256(market.getIdToAuction(nftContract, tokenId).auctionState), 2);
        assertEq(mockUsdc.balanceOf(seller), market.getIdToAuction(nftContract, tokenId).highestBid);
        assertEq(IERC721(nftContract).ownerOf(tokenId), user);
    }

    function testAuctionAlreadyFinalized() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        vm.warp(block.timestamp + 60);
        vm.roll(block.number + 1);
        market.finalizeAuction(nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert(Marketplace.Marketplace__AuctionAlreadyFinalized.selector);
        market.finalizeAuction(nftContract, tokenId);
        vm.stopPrank();
    }

    function testStillGotTime() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert(Marketplace.Marketplace__StillGotTime.selector);
        market.finalizeAuction(nftContract, tokenId);
        vm.stopPrank();
    }

    function testAuctionIsNotActive() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert(Marketplace.Marketplace__AuctionIsNotActive.selector);
        market.finalizeAuction(nftContract, tokenId);
    }

    function testSellerDoesNotExistWhenFinalizingAuction() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__SellerDoesNotExist.selector, market.getIdToAuction(nftContract, tokenId).seller
            )
        );
        market.finalizeAuction(nftContract, tokenId);
    }

    /////// CANCEL LISTING FUNCTION TEST

    function testListingIsCanceled() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);

        assertEq(IERC721(nftContract).ownerOf(tokenId), address(market));

        vm.expectEmit(true, true, false, true);
        emit Marketplace.Marketplace__ListingIsCanceled(nftContract, tokenId, seller);
        market.cancelListing(nftContract, tokenId);
        vm.stopPrank();

        Marketplace.AuctionData memory auctionData = market.getIdToAuction(nftContract, tokenId);

        assertEq(auctionData.seller, address(0));
        assertEq(auctionData.startingPrice, 0);
        assertEq(auctionData.nftContract, address(0));
        assertEq(auctionData.tokenId, 0);
        assertEq(auctionData.highestBidder, address(0));
        assertEq(auctionData.highestBid, 0);
        assertEq(auctionData.startTime, 0);
        assertEq(auctionData.deadline, 0);
        assertEq(uint256(auctionData.auctionState), 0);
        assertEq(IERC721(nftContract).ownerOf(tokenId), seller);
    }

    function testOnlySellerCanCancel() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.Marketplace__OnlySellerCanCancelListing.selector, user));
        market.cancelListing(nftContract, tokenId);
    }

    function testWrongListingState() public {
        vm.startPrank(seller);
        mintAndApprove();
        market.listNFT(startingPrice, nftContract, tokenId);
        vm.stopPrank();

        vm.startPrank(user);
        mockUsdc.mint(user, bidAmount);
        mockUsdc.approve(address(market), bidAmount);
        market.placeBid(bidAmount, nftContract, tokenId);
        vm.stopPrank();

        vm.prank(seller);
        vm.expectRevert(Marketplace.Marketplace__WrongListingState.selector);
        market.cancelListing(nftContract, tokenId);
    }

    function testSellerDoesNotExistWhenCancelingListing() public {
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.Marketplace__SellerDoesNotExist.selector, seller));
        market.cancelListing(nftContract, tokenId);
    }
}
