// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BountyFlow} from "../src/BountyFlow.sol";

contract BountyFlowTest is Test {
    BountyFlow bountyFlow;

    address client = makeAddr("client");
    address developer = makeAddr("developer");
    address attacker = makeAddr("attacker");

    uint256 constant REWARD = 1 ether;

    function setUp() public {
        bountyFlow = new BountyFlow();

        vm.deal(client, 10 ether);
        vm.deal(developer, 1 ether);
        vm.deal(attacker, 1 ether);
    }

    function createTestBounty() internal {
        vm.prank(client);

        bountyFlow.createBounty{value: REWARD}(
            "Build BountyFlow Frontend",
            "Build the frontend for BountyFlow",
            block.timestamp + 7 days
        );
    }

    function testCreateBounty() public {
        createTestBounty();

        BountyFlow.Bounty memory bounty =
            bountyFlow.getBounty(0);

        assertEq(bounty.id, 0);
        assertEq(bounty.client, client);
        assertEq(bounty.developer, address(0));
        assertEq(bounty.reward, REWARD);
        assertEq(bounty.title, "Build BountyFlow Frontend");

        assertEq(
            uint256(bounty.status),
            uint256(BountyFlow.BountyStatus.OPEN)
        );
    }

    function testDeveloperCanSubmitWork() public {
        createTestBounty();

        vm.prank(developer);

        bountyFlow.submitWork(
            0,
            "ipfs://bountyflow-submission"
        );

        BountyFlow.Bounty memory bounty =
            bountyFlow.getBounty(0);

        assertEq(bounty.developer, developer);
        assertEq(
            bounty.submission,
            "ipfs://bountyflow-submission"
        );

        assertEq(
            uint256(bounty.status),
            uint256(BountyFlow.BountyStatus.SUBMITTED)
        );
    }

    function testClientCanApproveSubmission() public {
        createTestBounty();

        vm.prank(developer);

        bountyFlow.submitWork(
            0,
            "ipfs://submission"
        );

        uint256 balanceBefore = developer.balance;

        vm.prank(client);

        bountyFlow.approveSubmission(0);

        uint256 balanceAfter = developer.balance;

        assertEq(
            balanceAfter,
            balanceBefore + REWARD
        );

        BountyFlow.Bounty memory bounty =
            bountyFlow.getBounty(0);

        assertEq(
            uint256(bounty.status),
            uint256(BountyFlow.BountyStatus.COMPLETED)
        );

        assertEq(bounty.reward, 0);
    }

    function testCannotApproveTwice() public {
        createTestBounty();

        vm.prank(developer);

        bountyFlow.submitWork(
            0,
            "ipfs://submission"
        );

        vm.prank(client);

        bountyFlow.approveSubmission(0);

        vm.prank(client);

        vm.expectRevert("No submission");

        bountyFlow.approveSubmission(0);
    }

    function testClientCanCancelBounty() public {
        createTestBounty();

        uint256 balanceBefore = client.balance;

        vm.prank(client);

        bountyFlow.cancelBounty(0);

        uint256 balanceAfter = client.balance;

        assertEq(
            balanceAfter,
            balanceBefore + REWARD
        );

        BountyFlow.Bounty memory bounty =
            bountyFlow.getBounty(0);

        assertEq(
            uint256(bounty.status),
            uint256(BountyFlow.BountyStatus.CANCELLED)
        );

        assertEq(bounty.reward, 0);
    }

    function testCannotCancelAfterSubmission() public {
        createTestBounty();

        vm.prank(developer);

        bountyFlow.submitWork(
            0,
            "ipfs://submission"
        );

        vm.prank(client);

        vm.expectRevert("Cannot cancel");

        bountyFlow.cancelBounty(0);
    }

    function testCannotSubmitAfterDeadline() public {
        createTestBounty();

        vm.warp(block.timestamp + 7 days + 1);

        vm.prank(developer);

        vm.expectRevert("Deadline passed");

        bountyFlow.submitWork(
            0,
            "ipfs://late-submission"
        );
    }

    function testClientCannotSubmitWork() public {
        createTestBounty();

        vm.prank(client);

        vm.expectRevert("Client cannot submit");

        bountyFlow.submitWork(
            0,
            "ipfs://fake-submission"
        );
    }

    function testAttackerCannotApprove() public {
        createTestBounty();

        vm.prank(developer);

        bountyFlow.submitWork(
            0,
            "ipfs://submission"
        );

        vm.prank(attacker);

        vm.expectRevert("Only client");

        bountyFlow.approveSubmission(0);
    }

    function testAttackerCannotCancel() public {
        createTestBounty();

        vm.prank(attacker);

        vm.expectRevert("Only client");

        bountyFlow.cancelBounty(0);
    }

    function testCannotCreateWithoutReward() public {
        vm.prank(client);

        vm.expectRevert("Reward must be greater than zero");

        bountyFlow.createBounty{value: 0}(
            "Invalid Bounty",
            "No reward",
            block.timestamp + 7 days
        );
    }

    function testCannotSubmitEmptyWork() public {
        createTestBounty();

        vm.prank(developer);

        vm.expectRevert("Submission required");

        bountyFlow.submitWork(0, "");
    }

    function testCannotCreateWithPastDeadline() public {
        vm.prank(client);

        vm.expectRevert("Invalid deadline");

        bountyFlow.createBounty{value: REWARD}(
            "Invalid Deadline",
            "Past deadline",
            block.timestamp - 1
        );
    }

    function testBountyCount() public {
        assertEq(bountyFlow.getBountyCount(), 0);

        createTestBounty();

        assertEq(bountyFlow.getBountyCount(), 1);
    }
}
