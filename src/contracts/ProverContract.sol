// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Verifier.sol";

/**
 * @title ReputationOracle
 * @dev Almacena scores de reputación verificados con ZK proofs
 */
contract ReputationOracle {
    Verifier public immutable verifier;
    
    struct ReputationScore {
        uint256 score;
        uint256 timestamp;
        bytes32 proofHash;
        bool verified;
    }
    
    mapping(address => ReputationScore) public scores;
    mapping(address => bool) public hasScore;
    
    event ScorePublished(
        address indexed user,
        uint256 score,
        uint256 timestamp,
        bytes32 proofHash
    );
    
    event ScoreUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore,
        uint256 timestamp
    );
    
    constructor(address _verifier) {
        verifier = Verifier(_verifier);
    }
    
    /**
     * @dev Publica un score de reputación verificado con ZK proof
     * @param proof El proof de RISC Zero
     * @param publicInputs Los inputs públicos (address, score, timestamp)
     */
    function publishScore(
        bytes calldata proof,
        bytes calldata publicInputs
    ) external {
        // Verificar el proof
        (
            bool success,
            address userAddress,
            uint256 score,
            uint256 timestamp
        ) = verifier.verifyAndExtract(proof, publicInputs);
        
        require(success, "Proof verification failed");
        require(userAddress == msg.sender, "Address mismatch");
        require(score <= 100, "Invalid score range");
        require(timestamp <= block.timestamp, "Future timestamp");
        
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        
        if (hasScore[userAddress]) {
            uint256 oldScore = scores[userAddress].score;
            emit ScoreUpdated(userAddress, oldScore, score, timestamp);
        } else {
            hasScore[userAddress] = true;
            emit ScorePublished(userAddress, score, timestamp, proofHash);
        }
        
        scores[userAddress] = ReputationScore({
            score: score,
            timestamp: timestamp,
            proofHash: proofHash,
            verified: true
        });
    }
    
    /**
     * @dev Obtiene el score de una dirección
     */
    function getScore(address user) external view returns (
        uint256 score,
        uint256 timestamp,
        bool verified
    ) {
        require(hasScore[user], "No score found");
        ReputationScore memory rep = scores[user];
        return (rep.score, rep.timestamp, rep.verified);
    }
    
    /**
     * @dev Verifica si una dirección tiene un score mínimo
     */
    function hasMinimumScore(
        address user,
        uint256 minimumScore
    ) external view returns (bool) {
        if (!hasScore[user]) return false;
        return scores[user].score >= minimumScore;
    }
}
