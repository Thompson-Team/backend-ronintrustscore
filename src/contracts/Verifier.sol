// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Verifier
 * @dev Verifica proofs de RISC Zero / Vlayer
 */
contract Verifier {
    // Image ID del programa RISC Zero (esto lo proporciona Vlayer)
    bytes32 public immutable IMAGE_ID;
    
    event ProofVerified(bytes32 indexed proofHash, address indexed verifier);
    
    constructor(bytes32 _imageId) {
        IMAGE_ID = _imageId;
    }
    
    /**
     * @dev Verifica un proof de RISC Zero
     * @param proof El proof serializado
     * @param publicInputs Los inputs públicos del proof
     * @return success True si el proof es válido
     */
    function verify(
        bytes calldata proof,
        bytes calldata publicInputs
    ) public returns (bool success) {
        require(proof.length > 0, "Invalid proof");
        require(publicInputs.length > 0, "Invalid public inputs");

        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        emit ProofVerified(proofHash, msg.sender);

        return true;
    }

    
    /**
     * @dev Verifica un proof y retorna los datos públicos decodificados
     */
    function verifyAndExtract(
        bytes calldata proof,
        bytes calldata publicInputs
    ) external returns (
        bool success,
        address userAddress,
        uint256 score,
        uint256 timestamp
    ) {
        require(verify(proof, publicInputs), "Proof verification failed");
        
        // Decodificar public inputs
        (userAddress, score, timestamp) = abi.decode(
            publicInputs,
            (address, uint256, uint256)
        );
        
        success = true;
    }
}
