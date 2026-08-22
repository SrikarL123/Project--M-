// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BountyFlow} from "../src/BountyFlow.sol";

contract DeployBountyFlow is Script {
    function run() external returns (BountyFlow) {
        vm.startBroadcast();

        BountyFlow bountyFlow = new BountyFlow();

        vm.stopBroadcast();

        return bountyFlow;
    }
}
