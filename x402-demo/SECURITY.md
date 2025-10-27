# Security Policy

## ⚠️ Important Security Notes

This is a **DEMO APPLICATION** for the x402 Payment Gateway running on **Solana Devnet**.

### For Production Use

If you plan to use this code in production:

1. **Never commit private keys or keypairs** to version control
2. **Use environment variables** for sensitive configuration
3. **Audit the smart contract** before deploying to mainnet
4. **Test thoroughly** on devnet before mainnet deployment
5. **Use a hardware wallet** for production deployments
6. **Implement proper error handling** and logging
7. **Add rate limiting** to prevent abuse
8. **Monitor transactions** for suspicious activity

### Demo Wallet Addresses

The demo uses hardcoded wallet addresses for demonstration purposes only:

- **Wallet 1 (2% - Platform)**: `8XLmbY1XRiPzeVNRDe9FZWHeCYKZAzvgc1c4EhyKsvEy` (Hardcoded in smart contract)
- **Wallet 2 (3% - Network)**: `EnWhSws9oy3chJQkBRHyDsWfb7qiUdCE8Ymte9tzkMLj`
- **Wallet 3 (30% - Creator)**: `Fe66vsN2aC8xZ62DTitjxhagMsAgKn5vAVCrE5cpQpGG`
- **Wallet 4 (65% - Content)**: `AhAFbuuPn9SAASXW4pM5yGCukMv4SiaFERsrQBYKZMJ9`

**Replace these addresses** with your actual production wallets before deploying.

### Smart Contract Security

- **Program ID (Devnet)**: `5g8XvMcpWEgHitW7abiYTr1u8sDasePLQnrebQyCLPvY`
- The smart contract is deployed on both **mainnet** and **devnet**
- Wallet 1 (2% platform fee) is **hardcoded** in the smart contract and cannot be changed by clients
- All other wallets can be configured per transaction

### Reporting Security Issues

If you discover a security vulnerability, please email: **[your-email@example.com]**

**Do NOT** open a public issue for security vulnerabilities.

## Best Practices

1. **Always verify transactions** on Solana Explorer before confirming
2. **Start with small amounts** when testing
3. **Use devnet** for all testing and development
4. **Keep dependencies updated** to patch security vulnerabilities
5. **Implement proper access controls** in your application
6. **Use HTTPS** for all production deployments
7. **Validate all user inputs** before processing

## Disclaimer

This software is provided "as is" without warranty of any kind. Use at your own risk.
The developers are not responsible for any loss of funds or damages resulting from the use of this software.
