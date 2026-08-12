//SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {DeployNft} from "../script/DeployNft.s.sol";
import {NftFactory} from "../src/NftFactory.sol";
import {CreateNft} from "../src/CreateNft.sol";

contract MintNftTest is Test {
    DeployNft deployer;
    NftFactory factory;
    CreateNft nft;

    string name = "ARMAN";
    string symbol = "ARM";
    address user = makeAddr("user");

    function setUp() external {
        deployer = new DeployNft();
        factory = deployer.run();
    }

    function testCollectionCreated() public {
        vm.prank(user);
        address expectedCollection = factory.createCollection(name, symbol);
        address actualCollection = factory.getUsersCollection(user)[0];

        assertEq(actualCollection, expectedCollection);
        assertTrue(actualCollection != address(0));
    }

    function testSvgCreated() public {
        vm.startPrank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);
        nft.mintNft();
        vm.stopPrank();

        uint256 tokenId = nft.getTokenCounter();
        assertEq(tokenId, 1);
        assertTrue(bytes(nft.getUserSvg(tokenId - 1)).length != 0);
    }

    function testIsUserOwnerOfNft() public {
        vm.startPrank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);
        nft.mintNft();
        vm.stopPrank();
    }

    function testTokenUriReturnsMetadata() public {
        vm.startPrank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);
        nft.mintNft();
        string memory uri = nft.tokenURI(0);
        vm.stopPrank();

        assertTrue(bytes(uri).length > 0);
    }

    function testOwnerOfMintedNft() public {
        vm.startPrank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);
        nft.mintNft();
        vm.stopPrank();

        assertEq(nft.ownerOf(0), user);
    }

    function testMultipleMintsIncreaseCounter() public {
        vm.startPrank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);

        nft.mintNft();
        nft.mintNft();
        nft.mintNft();
        vm.stopPrank();

        assertEq(nft.getTokenCounter(), 3);
    }

    function testEachTokenHasDifferentSvg() public {
        vm.startPrank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);

        nft.mintNft();
        nft.mintNft();
        vm.stopPrank();

        string memory svg0 = nft.getUserSvg(0);
        string memory svg1 = nft.getUserSvg(1);

        assertTrue(keccak256(bytes(svg0)) != keccak256(bytes(svg1)));
    }

    function testMintEmitsEvent() public {
        vm.startPrank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);

        vm.expectEmit(true, false, false, true);
        emit CreateNft.CreateNft__NFTMinted(user, 0);
        nft.mintNft();
        vm.stopPrank();
    }

    function testInitialTokenCounterIsZero() public {
        vm.prank(user);
        address collection = factory.createCollection(name, symbol);
        nft = CreateNft(collection);
        assertEq(nft.getTokenCounter(), 0);
    }
}
