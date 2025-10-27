import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';

// Program ID (devnet)
export const PROGRAM_ID = new PublicKey('5g8XvMcpWEgHitW7abiYTr1u8sDasePLQnrebQyCLPvY');

// Hardcoded Wallet 1 (2% fee)
export const WALLET_1_FIXED = new PublicKey('8XLmbY1XRiPzeVNRDe9FZWHeCYKZAzvgc1c4EhyKsvEy');

// Instruction discriminators
const VERIFY_PAYMENT_DISCRIMINATOR = 0;
const SETTLE_PAYMENT_DISCRIMINATOR = 1;

/**
 * Find the payment record PDA
 */
export function findPaymentRecordPDA(
  payer: PublicKey,
  nonce: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  // Convert bigint to little-endian bytes (browser-compatible)
  const nonceBuffer = new Uint8Array(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, nonce, true); // true = little-endian
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from('payment'), payer.toBuffer(), Buffer.from(nonceBuffer)],
    programId
  );
}

/**
 * Create verify payment instruction
 */
export function createVerifyPaymentInstruction(
  payer: PublicKey,
  paymentRecord: PublicKey,
  recipient: PublicKey,
  tokenMint: PublicKey,
  payerTokenAccount: PublicKey,
  amount: bigint,
  nonce: bigint,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  // Browser-compatible data encoding
  const data = new Uint8Array(25);
  const view = new DataView(data.buffer);
  
  view.setUint8(0, VERIFY_PAYMENT_DISCRIMINATOR);
  view.setBigUint64(1, amount, true); // little-endian
  view.setBigUint64(9, nonce, true); // little-endian
  view.setBigUint64(17, BigInt(0), true); // timestamp (unused)

  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: paymentRecord, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: false },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: payerTokenAccount, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('SysvarC1ock11111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.from(data),
  });
}

/**
 * Create settle payment instruction
 */
export function createSettlePaymentInstruction(
  payer: PublicKey,
  paymentRecord: PublicKey,
  payerTokenAccount: PublicKey,
  wallet1TokenAccount: PublicKey,
  wallet2TokenAccount: PublicKey,
  wallet3TokenAccount: PublicKey,
  wallet4TokenAccount: PublicKey,
  nonce: bigint,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  // Browser-compatible data encoding
  const data = new Uint8Array(9);
  const view = new DataView(data.buffer);
  
  view.setUint8(0, SETTLE_PAYMENT_DISCRIMINATOR);
  view.setBigUint64(1, nonce, true); // little-endian

  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: paymentRecord, isSigner: false, isWritable: true },
      { pubkey: payerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: wallet1TokenAccount, isSigner: false, isWritable: true },
      { pubkey: wallet2TokenAccount, isSigner: false, isWritable: true },
      { pubkey: wallet3TokenAccount, isSigner: false, isWritable: true },
      { pubkey: wallet4TokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.from(data),
  });
}
