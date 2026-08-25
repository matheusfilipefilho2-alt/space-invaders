package config

type SolanaConfig struct {
	RpcURL          string // e.g., https://api.mainnet-beta.solana.com
	TreasuryPrivKey string // Base58-encoded private key
	TokenMintPubkey string // SPACE token mint address
	Network         string // devnet, testnet, mainnet-beta
}
