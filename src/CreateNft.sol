//SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {RandomSvgGenerator} from "./RandomSvgGenerator.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract CreateNft is ERC721 {
    using Strings for uint256;
    uint256 private sTokenCounter;
    mapping(uint256 => string) private sTokenIdToSvg;

    event CreateNft__NFTMinted(address user, uint256 tokenNumber);

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {
        sTokenCounter = 0;
    }

    function mintNft() public {
        uint256 tokenIdToMint = sTokenCounter;
        sTokenCounter++;
        sTokenIdToSvg[tokenIdToMint] = RandomSvgGenerator.generateRawSvg(tokenIdToMint, address(this));
        _safeMint(msg.sender, tokenIdToMint);
        emit CreateNft__NFTMinted(msg.sender, tokenIdToMint);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "On-Chain NFT #',
                        tokenId.toString(),
                        '", "description": "100% on-chain generated SVG.", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(sTokenIdToSvg[tokenId])),
                        '"}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function getUserSvg(uint256 tokenId) public view returns (string memory) {
        return sTokenIdToSvg[tokenId];
    }

    function getTokenCounter() public view returns (uint256) {
        return sTokenCounter;
    }
}
