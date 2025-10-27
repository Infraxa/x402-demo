'use client';

import { useState } from 'react';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createSyncNativeInstruction } from '@solana/spl-token';
import { findPaymentRecordPDA, createVerifyPaymentInstruction, createSettlePaymentInstruction, WALLET_1_FIXED, PROGRAM_ID } from '@/lib/x402';

const RPC_URL = 'https://api.devnet.solana.com';
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Demo content wallets (you can replace these with your actual wallets)
const DEMO_WALLET_2 = new PublicKey('EnWhSws9oy3chJQkBRHyDsWfb7qiUdCE8Ymte9tzkMLj');
const DEMO_WALLET_3 = new PublicKey('Fe66vsN2aC8xZ62DTitjxhagMsAgKn5vAVCrE5cpQpGG');
const DEMO_WALLET_4 = new PublicKey('AhAFbuuPn9SAASXW4pM5yGCukMv4SiaFERsrQBYKZMJ9');

export default function PaymentDemo() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [contentUnlocked, setContentUnlocked] = useState(false);

  const connectWallet = async () => {
    try {
      // @ts-ignore
      const { solana } = window;
      
      if (!solana) {
        alert('Please install Phantom wallet!');
        return;
      }

      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
      setStatus('Wallet connected!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStatus('Failed to connect wallet');
    }
  };

  const disconnectWallet = async () => {
    try {
      // @ts-ignore
      const { solana } = window;
      await solana.disconnect();
      setWalletAddress(null);
      setStatus('');
      setTxSignature(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const payForContent = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first!');
      return;
    }

    setIsProcessing(true);
    setStatus('Processing payment...');
    setTxSignature(null);

    try {
      // @ts-ignore
      const { solana } = window;
      const connection = new Connection(RPC_URL, 'confirmed');
      const payer = new PublicKey(walletAddress);

      // Get token accounts
      const payerTokenAccount = await getAssociatedTokenAddress(WSOL_MINT, payer);
      const wallet1TokenAccount = await getAssociatedTokenAddress(WSOL_MINT, WALLET_1_FIXED);
      const wallet2TokenAccount = await getAssociatedTokenAddress(WSOL_MINT, DEMO_WALLET_2);
      const wallet3TokenAccount = await getAssociatedTokenAddress(WSOL_MINT, DEMO_WALLET_3);
      const wallet4TokenAccount = await getAssociatedTokenAddress(WSOL_MINT, DEMO_WALLET_4);

      // Payment amount: 0.01 SOL
      const amount = BigInt(0.01 * LAMPORTS_PER_SOL);
      const nonce = BigInt(Date.now());

      const [paymentRecordPDA] = findPaymentRecordPDA(payer, nonce, PROGRAM_ID);

      setStatus('Preparing wrapped SOL...');

      // Import needed modules
      const { SystemProgram } = await import('@solana/web3.js');
      const { getAccount } = await import('@solana/spl-token');

      // Check if we need to create/fund the wrapped SOL account
      let needsWrapping = false;
      try {
        const tokenAccountInfo = await getAccount(connection, payerTokenAccount);
        // Check if balance is sufficient
        if (Number(tokenAccountInfo.amount) < 0.02 * LAMPORTS_PER_SOL) {
          needsWrapping = true;
        }
      } catch {
        // Account doesn't exist, need to create and wrap
        needsWrapping = true;
      }

      if (needsWrapping) {
        setStatus('Creating wrapped SOL account...');
        
        // Build transaction with all steps
        const wrapTx = new Transaction();
        
        // Check if account exists
        const accountInfo = await connection.getAccountInfo(payerTokenAccount);
        if (!accountInfo) {
          // Add create instruction
          wrapTx.add(
            createAssociatedTokenAccountInstruction(
              payer,
              payerTokenAccount,
              payer,
              WSOL_MINT
            )
          );
        }
        
        // Add transfer and sync
        wrapTx.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: payerTokenAccount,
            lamports: BigInt(0.02 * LAMPORTS_PER_SOL),
          })
        );
        
        wrapTx.add(createSyncNativeInstruction(payerTokenAccount));

        // Get fresh blockhash and send
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        wrapTx.recentBlockhash = blockhash;
        wrapTx.feePayer = payer;

        const signedWrapTx = await solana.signTransaction(wrapTx);
        const wrapSig = await connection.sendRawTransaction(signedWrapTx.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        });
        
        // Wait for confirmation
        await connection.confirmTransaction(wrapSig, 'confirmed');
        
        // Extra wait to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setStatus('Verifying payment...');

      // Create verify instruction
      const verifyIx = createVerifyPaymentInstruction(
        payer,
        paymentRecordPDA,
        DEMO_WALLET_4,
        WSOL_MINT,
        payerTokenAccount,
        amount,
        nonce,
        PROGRAM_ID
      );

      const verifyTx = new Transaction().add(verifyIx);
      const { blockhash: verifyBlockhash } = await connection.getLatestBlockhash('finalized');
      verifyTx.recentBlockhash = verifyBlockhash;
      verifyTx.feePayer = payer;

      const signedVerifyTx = await solana.signTransaction(verifyTx);
      const verifySig = await connection.sendRawTransaction(signedVerifyTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      
      // Wait for confirmation
      await connection.confirmTransaction(verifySig, 'confirmed');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus('Settling payment (4-way split)...');

      // Create settle instruction
      const settleIx = createSettlePaymentInstruction(
        payer,
        paymentRecordPDA,
        payerTokenAccount,
        wallet1TokenAccount,
        wallet2TokenAccount,
        wallet3TokenAccount,
        wallet4TokenAccount,
        nonce,
        PROGRAM_ID
      );

      const settleTx = new Transaction().add(settleIx);
      const { blockhash: settleBlockhash } = await connection.getLatestBlockhash('finalized');
      settleTx.recentBlockhash = settleBlockhash;
      settleTx.feePayer = payer;

      const signedSettleTx = await solana.signTransaction(settleTx);
      const signature = await connection.sendRawTransaction(signedSettleTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setTxSignature(signature);
      setContentUnlocked(true);
      setStatus('Payment successful! Content unlocked! 🎉');
    } catch (error: any) {
      console.error('Payment error:', error);
      setStatus(`Payment failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            x402 Payment Gateway
          </h1>
          <p className="text-xl text-gray-300">
            Decentralized content monetization with automatic revenue splitting
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          {!walletAddress ? (
            <button
              onClick={connectWallet}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              Connect Phantom Wallet
            </button>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-300 text-sm mb-1">Connected Wallet</p>
                <p className="text-white font-mono text-sm">
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </p>
              </div>
              <button
                onClick={disconnectWallet}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Premium Content Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">
              🔒 Premium Article
            </h2>
            <p className="text-gray-300">
              Unlock this exclusive content for just 0.01 SOL
            </p>
          </div>

          {/* Content Preview / Unlocked Content */}
          <div className="relative mb-6">
            {!contentUnlocked ? (
              <>
                <div className="bg-white/5 rounded-xl p-6 blur-sm select-none">
                  <h3 className="text-xl font-semibold text-white mb-3">
                    The Future of Web3 Payments
                  </h3>
                  <p className="text-gray-300 mb-3">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...
                  </p>
                  <p className="text-gray-300">
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat...
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 backdrop-blur-sm rounded-xl p-6 text-center">
                    <p className="text-white font-bold text-lg mb-4">
                      Pay 0.01 SOL to unlock
                    </p>
                    <button
                      onClick={payForContent}
                      disabled={!walletAddress || isProcessing}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isProcessing ? 'Processing...' : 'Unlock Content'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border-2 border-green-500/50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🎉</span>
                  <h3 className="text-2xl font-bold text-white">
                    The Future of Web3 Payments
                  </h3>
                </div>
                <div className="text-gray-200 space-y-4">
                  <p>
                    Welcome to the future of content monetization! With x402, creators can now receive instant payments with automatic revenue splitting, all powered by Solana's blazing-fast blockchain.
                  </p>
                  <p>
                    Traditional payment systems charge high fees and take days to settle. With x402, payments are settled in seconds with minimal fees, and the revenue is automatically split among all stakeholders according to predefined percentages.
                  </p>
                  <p>
                    This opens up new possibilities for:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Pay-per-article journalism</li>
                    <li>Premium video content</li>
                    <li>Educational courses and tutorials</li>
                    <li>Exclusive community access</li>
                    <li>Digital art and NFT utilities</li>
                  </ul>
                  <p>
                    The best part? Everything is transparent and verifiable on-chain. You can see exactly where your payment went and how it was split. No hidden fees, no intermediaries taking a cut without your knowledge.
                  </p>
                  <p className="font-semibold text-green-300">
                    Thank you for supporting decentralized content monetization! 🚀
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          {status && (
            <div className={`p-4 rounded-lg mb-4 ${
              status.includes('successful') ? 'bg-green-500/20 border border-green-500/50' :
              status.includes('failed') ? 'bg-red-500/20 border border-red-500/50' :
              'bg-blue-500/20 border border-blue-500/50'
            }`}>
              <p className="text-white">{status}</p>
            </div>
          )}

          {/* Transaction Link */}
          {txSignature && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-white mb-2">Transaction successful!</p>
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 underline text-sm break-all"
              >
                View on Solana Explorer →
              </a>
            </div>
          )}

          {/* Revenue Split Info */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-lg font-semibold text-white mb-3">
              💰 Revenue Split (4-way)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-400">Platform Fee</p>
                <p className="text-white font-bold">2% (0.0002 SOL)</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-400">Network Fee</p>
                <p className="text-white font-bold">3% (0.0003 SOL)</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-400">Creator Share</p>
                <p className="text-white font-bold">30% (0.003 SOL)</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-400">Content Owner</p>
                <p className="text-white font-bold">65% (0.0065 SOL)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>Running on Solana Devnet</p>
          <p className="mt-2">
            Program ID: <span className="font-mono text-gray-300">{PROGRAM_ID.toString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
