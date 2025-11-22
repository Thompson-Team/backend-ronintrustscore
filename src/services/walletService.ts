import { ethers } from 'ethers';

/**
 * Verifica la firma de un mensaje usando ethers.js
 */
export const verifySignature = async (
  address: string,
  signature: string,
  message?: string
): Promise<boolean> => {
  try {
    // Si no se proporciona mensaje, crear uno genérico
    const messageToVerify = message || `Sign this message to verify your identity.\n\nWallet: ${address}`;

    // Recuperar la dirección desde la firma
    const recoveredAddress = ethers.verifyMessage(messageToVerify, signature);

    // Comparar direcciones (case-insensitive)
    const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();

    console.log('Signature verification:', {
      provided: address,
      recovered: recoveredAddress,
      valid: isValid
    });

    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};

/**
 * Verifica que la dirección sea válida
 */
export const isValidAddress = (address: string): boolean => {
  return ethers.isAddress(address);
};

/**
 * Normaliza una dirección a checksum format
 */
export const normalizeAddress = (address: string): string => {
  return ethers.getAddress(address);
};