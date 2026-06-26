// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {ERC20Mock} from "../src/mock/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployMarketplace is Script {
    function run() external returns(Marketplace){
        IERC20 mock = new ERC20Mock();
        vm.startBroadcast();
        Marketplace marketplace = new Marketplace(mock,msg.sender);
        vm.stopBroadcast();
        return marketplace;
    }
}