//SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script} from "forge-std/Script.sol";
import {NftFactory} from "../src/NftFactory.sol";
import {RandomSvgGenerator} from "../src/RandomSvgGenerator.sol";

contract DeployNft is Script {
    function run() external returns (NftFactory) {
        vm.startBroadcast();
        NftFactory factory = new NftFactory();
        vm.stopBroadcast();
        return factory;
    }
}
