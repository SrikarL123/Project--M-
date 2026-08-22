export const CONTRACT_ADDRESS =
    "0xe9cA989dDa5d6Ebf3bAE29CA470ACad0768751e5";

// Dynamic Backend API URL:
// - Uses local Flask server during local development
// - Uses relative path on Vercel/production (routes through /api on the same HTTPS domain)
const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1" ||
     window.location.hostname === "0.0.0.0");

export const BACKEND_URL = isLocalhost ? "http://127.0.0.1:5000" : "";

export const MONAD_TESTNET = {
    chainId: "0x279f",
    chainName: "Monad Testnet",
    nativeCurrency: {
        name: "MON",
        symbol: "MON",
        decimals: 18
    },
    rpcUrls: [
        "https://testnet-rpc.monad.xyz"
    ],
    blockExplorerUrls: [
        "https://testnet.monadscan.com"
    ]
};
