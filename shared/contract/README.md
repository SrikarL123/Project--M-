# Shared Contract Artifacts

This directory holds the ABI and deployment metadata produced by Person 1's contract build.

## Expected Files

| File | Source | Consumer |
|---|---|---|
| `MonadBounty.abi.json` | Person 1's Foundry build output | Person 2's frontend adapter |
| `deployment.json` | Person 1 after Testnet deploy | Everyone |

## How to Update

Person 1: After deploying to Monad Testnet, copy the ABI and create `deployment.json`:

```json
{
  "address": "0x...",
  "transactionHash": "0x...",
  "deployerAddress": "0x...",
  "chainId": 10143,
  "blockNumber": 0,
  "compilerVersion": "",
  "optimizerEnabled": true,
  "timestamp": ""
}
```
