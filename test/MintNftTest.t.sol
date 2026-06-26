//SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {DeployNft} from "../script/DeployNft.s.sol";
import {NftFactory} from "../src/NftFactory.sol";
import {CreateNft} from "../src/CreateNft.sol";
import {console} from "forge-std/console.sol";
import {RandomSvgGenerator} from "../src/RandomSvgGenerator.sol";

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

        console.log("Expected collection address:", expectedCollection);
        console.log("Actual collection address:", actualCollection);

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
        console.log(nft.ownerOf(0));
        console.log(user);
    }
}
