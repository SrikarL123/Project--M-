// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract BountyFlow is ReentrancyGuard {
    enum BountyStatus {
        OPEN,
        SUBMITTED,
        COMPLETED,
        CANCELLED
    }

    struct Bounty {
        uint256 id;
        address client;
        address developer;
        string title;
        string description;
        uint256 reward;
        uint256 deadline;
        string submission;
        BountyStatus status;
    }

    uint256 private nextBountyId;

    mapping(uint256 => Bounty) public bounties;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed client,
        uint256 reward,
        uint256 deadline
    );

    event WorkSubmitted(
        uint256 indexed bountyId,
        address indexed developer,
        string submission
    );

    event BountyCompleted(
        uint256 indexed bountyId,
        address indexed developer,
        uint256 reward
    );

    event BountyCancelled(
        uint256 indexed bountyId,
        uint256 refund
    );

    modifier onlyClient(uint256 bountyId) {
        require(
            msg.sender == bounties[bountyId].client,
            "Only client"
        );
        _;
    }

    modifier bountyExists(uint256 bountyId) {
        require(
            bountyId < nextBountyId,
            "Bounty does not exist"
        );
        _;
    }

    function createBounty(
        string calldata title,
        string calldata description,
        uint256 deadline
    ) external payable {
        require(msg.value > 0, "Reward must be greater than zero");
        require(deadline > block.timestamp, "Invalid deadline");

        uint256 bountyId = nextBountyId;

        bounties[bountyId] = Bounty({
            id: bountyId,
            client: msg.sender,
            developer: address(0),
            title: title,
            description: description,
            reward: msg.value,
            deadline: deadline,
            submission: "",
            status: BountyStatus.OPEN
        });

        nextBountyId++;

        emit BountyCreated(
            bountyId,
            msg.sender,
            msg.value,
            deadline
        );
    }

    function submitWork(
        uint256 bountyId,
        string calldata submission
    )
        external
        bountyExists(bountyId)
    {
        Bounty storage bounty = bounties[bountyId];

        require(
            bounty.status == BountyStatus.OPEN,
            "Bounty not open"
        );

        require(
            msg.sender != bounty.client,
            "Client cannot submit"
        );

        require(
            block.timestamp <= bounty.deadline,
            "Deadline passed"
        );

        require(
            bytes(submission).length > 0,
            "Submission required"
        );

        bounty.developer = msg.sender;
        bounty.submission = submission;
        bounty.status = BountyStatus.SUBMITTED;

        emit WorkSubmitted(
            bountyId,
            msg.sender,
            submission
        );
    }

    function approveSubmission(
        uint256 bountyId
    )
        external
        bountyExists(bountyId)
        onlyClient(bountyId)
        nonReentrant
    {
        Bounty storage bounty = bounties[bountyId];

        require(
            bounty.status == BountyStatus.SUBMITTED,
            "No submission"
        );

        require(
            bounty.developer != address(0),
            "No developer"
        );

        bounty.status = BountyStatus.COMPLETED;

        uint256 reward = bounty.reward;
        address developer = bounty.developer;

        bounty.reward = 0;

        (bool success, ) = payable(developer).call{
            value: reward
        }("");

        require(success, "Payment failed");

        emit BountyCompleted(
            bountyId,
            developer,
            reward
        );
    }

    function cancelBounty(
        uint256 bountyId
    )
        external
        bountyExists(bountyId)
        onlyClient(bountyId)
        nonReentrant
    {
        Bounty storage bounty = bounties[bountyId];

        require(
            bounty.status == BountyStatus.OPEN,
            "Cannot cancel"
        );

        bounty.status = BountyStatus.CANCELLED;

        uint256 refund = bounty.reward;

        bounty.reward = 0;

        (bool success, ) = payable(msg.sender).call{
            value: refund
        }("");

        require(success, "Refund failed");

        emit BountyCancelled(
            bountyId,
            refund
        );
    }

    function getBounty(
        uint256 bountyId
    )
        external
        view
        bountyExists(bountyId)
        returns (Bounty memory)
    {
        return bounties[bountyId];
    }

    function getBountyCount()
        external
        view
        returns (uint256)
    {
        return nextBountyId;
    }
}
