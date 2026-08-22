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
  "address": "0xe9cA989dDa5d6Ebf3bAE29CA470ACad0768751e5",
  "transactionHash": "0x24407a2c85d7d9d8eb110fb34b5b094177e0746b626416679b4bc8e271499b8c",
  "deployerAddress": "0xDE82974Bd77547696dDcE950c8ff1b8127068393",
  "chainId": 10143,
  "blockNumber": 55934340,
  "compilerVersion": "0.8.34",
  "optimizerEnabled": true,
  "timestamp": "2026-08-22T17:48:33+05:30"
}
```
