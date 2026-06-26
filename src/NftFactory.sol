//SPDX-License-Identifier:MIT
pragma solidity ^0.8.33;

import {CreateNft} from "./CreateNft.sol";

contract NftFactory {
    mapping(address => address[]) public sUserCollection;

    event NftFactory__CollectionCreated(address indexed user, address nftAddress, string name, string symbol);

    function createCollection(string memory _name, string memory _symbol) public returns (address) {
        CreateNft nft = new CreateNft(_name, _symbol);
        emit NftFactory__CollectionCreated(msg.sender, address(nft), _name, _symbol);
        sUserCollection[msg.sender].push(address(nft));
        return address(nft);
    }

    function getUsersCollection(address user) public view returns(address[] memory){
        return sUserCollection[user];
    }
}
