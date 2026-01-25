# Blockchain Contracts

**Module**: blockchain
**Base Path**: `/api/v1/blockchain`

## Overview

Blockchain integration endpoints for certificate issuance, verification, and network management. Handles smart contract interactions and IPFS metadata storage.

**Implementation Reference**: [Blockchain Implementation](../research.md#blockchain-implementation), [Data Model - Certificates](../data-model.md#certificates-collection)

## Network Information

### GET /blockchain/network

Get blockchain network status and information.

**Access**: Public
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "network": {
      "name": "sepolia",
      "chainId": 11155111,
      "blockNumber": 12345678,
      "gasPrice": "20000000000",
      "networkStatus": "healthy",
      "lastBlockTime": "2025-09-20T16:00:00.000Z"
    },
    "contracts": {
      "certificateRegistry": {
        "address": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D1234",
        "version": "1.0.0",
        "status": "active",
        "deployedAt": "2025-09-15T10:00:00.000Z"
      }
    },
    "ipfs": {
      "gateway": "https://ipfs.infura.io:5001",
      "status": "connected",
      "peersCount": 45,
      "lastPinTime": "2025-09-20T15:55:00.000Z"
    },
    "statistics": {
      "totalCertificatesIssued": 1789,
      "certificatesThisMonth": 234,
      "verificationRequests": 456,
      "successRate": 99.1
    }
  }
}
```

## Certificate Issuance

### POST /blockchain/certificates/issue

Issue a new blockchain certificate.

**Access**: Protected (Teacher/Admin role)
**Rate Limit**: 100 requests/hour per user

**Request Body**:

```json
{
  "examSessionId": "507f1f77bcf86cd799439011",
  "recipientAddress": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D5678",
  "metadata": {
    "courseName": "Advanced Computer Science",
    "examTitle": "Final Examination",
    "score": 84,
    "maxScore": 100,
    "passingScore": 70,
    "completionDate": "2025-09-20T16:00:00.000Z",
    "issuerInstitution": "University of Technology",
    "credentialLevel": "undergraduate"
  },
  "customFields": {
    "gpa": 3.7,
    "honors": "magna_cum_laude",
    "specialization": "AI & Machine Learning"
  }
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "507f1f77bcf86cd799439020",
      "tokenId": 1789,
      "contractAddress": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D1234",
      "recipientAddress": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D5678",
      "txHash": "0xabc123def456...",
      "blockNumber": 12345679,
      "ipfsHash": "QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq",
      "status": "pending",
      "issuedAt": "2025-09-20T16:15:00.000Z",
      "estimatedConfirmationTime": "2025-09-20T16:18:00.000Z"
    },
    "transaction": {
      "hash": "0xabc123def456...",
      "gasUsed": "125000",
      "gasPrice": "20000000000",
      "cost": "0.0025"
    },
    "metadata": {
      "ipfsUrl": "https://ipfs.infura.io/ipfs/QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq",
      "size": "2.4KB",
      "verificationCode": "CERT-EDU-20250920-1789"
    }
  }
}
```

### GET /blockchain/certificates/{certificateId}/status

Get certificate issuance status and confirmations.

**Access**: Protected (Owner/Teacher/Admin)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "507f1f77bcf86cd799439020",
      "status": "confirmed",
      "txHash": "0xabc123def456...",
      "blockNumber": 12345679,
      "confirmations": 12,
      "requiredConfirmations": 6,
      "confirmedAt": "2025-09-20T16:18:00.000Z"
    },
    "blockchain": {
      "networkFee": "0.0025 ETH",
      "gasUsed": "125000",
      "blockTimestamp": "2025-09-20T16:16:30.000Z"
    },
    "ipfs": {
      "hash": "QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq",
      "pinned": true,
      "size": "2.4KB",
      "accessUrl": "https://ipfs.infura.io/ipfs/QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq"
    }
  }
}
```

## Certificate Verification

### GET /blockchain/certificates/verify/{tokenId}

Verify certificate authenticity by token ID.

**Access**: Public
**Rate Limit**: 1000 requests/hour per IP

**Response 200**:

```json
{
  "success": true,
  "data": {
    "verification": {
      "isValid": true,
      "tokenId": 1789,
      "contractAddress": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D1234",
      "ownerAddress": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D5678",
      "issuedAt": "2025-09-20T16:15:00.000Z",
      "verifiedAt": "2025-09-21T10:30:00.000Z"
    },
    "certificate": {
      "courseName": "Advanced Computer Science",
      "examTitle": "Final Examination",
      "recipientName": "John Smith",
      "score": 84,
      "maxScore": 100,
      "completionDate": "2025-09-20T16:00:00.000Z",
      "issuerInstitution": "University of Technology",
      "verificationCode": "CERT-EDU-20250920-1789"
    },
    "blockchain": {
      "txHash": "0xabc123def456...",
      "blockNumber": 12345679,
      "blockTimestamp": "2025-09-20T16:16:30.000Z",
      "confirmations": 1234
    },
    "metadata": {
      "ipfsHash": "QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq",
      "lastVerified": "2025-09-21T10:30:00.000Z",
      "verificationCount": 5
    }
  }
}
```

### POST /blockchain/certificates/verify/batch

Batch verify multiple certificates.

**Access**: Public
**Rate Limit**: 100 requests/hour per IP

**Request Body**:

```json
{
  "certificates": [
    {
      "type": "tokenId",
      "value": "1789"
    },
    {
      "type": "verificationCode",
      "value": "CERT-EDU-20250920-1790"
    },
    {
      "type": "txHash",
      "value": "0xdef456abc789..."
    }
  ]
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "verifications": [
      {
        "input": {
          "type": "tokenId",
          "value": "1789"
        },
        "result": {
          "isValid": true,
          "tokenId": 1789,
          "courseName": "Advanced Computer Science",
          "recipientName": "John Smith",
          "score": 84
        }
      },
      {
        "input": {
          "type": "verificationCode",
          "value": "CERT-EDU-20250920-1790"
        },
        "result": {
          "isValid": false,
          "error": "Certificate not found"
        }
      }
    ],
    "summary": {
      "total": 3,
      "valid": 2,
      "invalid": 1,
      "errors": 0
    }
  }
}
```

## Smart Contract Management

### GET /blockchain/contracts/certificate-registry

Get certificate registry contract information.

**Access**: Protected (Admin role)
**Rate Limit**: Standard

**Response 200**:

```json
{
  "success": true,
  "data": {
    "contract": {
      "address": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D1234",
      "name": "EduChainCertificateRegistry",
      "version": "1.0.0",
      "deployedAt": "2025-09-15T10:00:00.000Z",
      "deployedBy": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D9999",
      "owner": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D9999"
    },
    "statistics": {
      "totalSupply": 1789,
      "lastTokenId": 1789,
      "totalHolders": 1456,
      "dailyIssuance": 23,
      "monthlyIssuance": 234
    },
    "configuration": {
      "maxSupply": "unlimited",
      "mintingPaused": false,
      "transfersPaused": false,
      "baseURI": "https://ipfs.infura.io/ipfs/",
      "royaltyPercentage": 0
    },
    "permissions": {
      "minters": [
        "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D8888",
        "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D7777"
      ],
      "pausers": ["0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D9999"]
    }
  }
}
```

### POST /blockchain/contracts/certificate-registry/pause

Pause/unpause certificate issuance.

**Access**: Protected (Admin role)
**Rate Limit**: 5 requests/hour

**Request Body**:

```json
{
  "paused": true,
  "reason": "Contract upgrade maintenance",
  "estimatedDuration": 3600
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "operation": {
      "type": "pause_contract",
      "txHash": "0x789abc123def...",
      "status": "pending",
      "estimatedConfirmation": "2025-09-20T20:05:00.000Z"
    },
    "contract": {
      "address": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D1234",
      "paused": true,
      "pausedAt": "2025-09-20T20:00:00.000Z",
      "pausedBy": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D9999"
    }
  }
}
```

## IPFS Operations

### POST /blockchain/ipfs/pin

Pin certificate metadata to IPFS.

**Access**: Protected (System/Admin)
**Rate Limit**: 500 requests/hour

**Request Body**:

```json
{
  "metadata": {
    "certificateId": "507f1f77bcf86cd799439020",
    "courseName": "Advanced Computer Science",
    "examTitle": "Final Examination",
    "recipientName": "John Smith",
    "score": 84,
    "maxScore": 100,
    "completionDate": "2025-09-20T16:00:00.000Z",
    "issuerInstitution": "University of Technology"
  },
  "options": {
    "pin": true,
    "wrapWithDirectory": false,
    "cidVersion": 1
  }
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "ipfs": {
      "hash": "QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq",
      "size": "2.4KB",
      "url": "https://ipfs.infura.io/ipfs/QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq",
      "pinned": true,
      "pinnedAt": "2025-09-20T16:12:00.000Z"
    },
    "metadata": {
      "cidVersion": 1,
      "format": "dag-pb",
      "multihash": "sha2-256"
    }
  }
}
```

### GET /blockchain/ipfs/{hash}

Retrieve certificate metadata from IPFS.

**Access**: Public
**Rate Limit**: 1000 requests/hour per IP

**Response 200**:

```json
{
  "success": true,
  "data": {
    "metadata": {
      "certificateId": "507f1f77bcf86cd799439020",
      "courseName": "Advanced Computer Science",
      "examTitle": "Final Examination",
      "recipientName": "John Smith",
      "score": 84,
      "maxScore": 100,
      "completionDate": "2025-09-20T16:00:00.000Z",
      "issuerInstitution": "University of Technology",
      "verificationCode": "CERT-EDU-20250920-1789"
    },
    "ipfs": {
      "hash": "QmYwAPJzv5CZsnA8rdYtLgm5qN8W6B2HqwLw3wJT8Zf7Aq",
      "size": "2.4KB",
      "pinned": true,
      "lastAccessed": "2025-09-21T10:30:00.000Z",
      "accessCount": 12
    }
  }
}
```

## Gas Management

### GET /blockchain/gas/estimate

Get gas price estimates for certificate operations.

**Access**: Public
**Rate Limit**: Standard

**Query Parameters**:

- `operation`: mint, transfer, burn
- `speed`: slow, standard, fast

**Response 200**:

```json
{
  "success": true,
  "data": {
    "estimates": {
      "mint": {
        "gasLimit": "125000",
        "gasPrice": {
          "slow": "18000000000",
          "standard": "20000000000",
          "fast": "25000000000"
        },
        "cost": {
          "slow": "0.00225 ETH",
          "standard": "0.0025 ETH",
          "fast": "0.003125 ETH"
        },
        "estimatedTime": {
          "slow": "5-10 minutes",
          "standard": "2-5 minutes",
          "fast": "1-2 minutes"
        }
      }
    },
    "network": {
      "currentGasPrice": "20000000000",
      "networkCongestion": "low",
      "lastUpdated": "2025-09-20T20:00:00.000Z"
    }
  }
}
```

## Error Responses

### 503 Service Unavailable - Blockchain Network Issues

```json
{
  "success": false,
  "error": {
    "code": "BLOCKCHAIN_NETWORK_UNAVAILABLE",
    "message": "Blockchain network is currently unavailable",
    "details": {
      "network": "sepolia",
      "lastKnownBlock": 12345678,
      "estimatedRecovery": "2025-09-20T21:00:00.000Z"
    }
  }
}
```

### 402 Payment Required - Insufficient Gas

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_GAS_FUNDS",
    "message": "Insufficient funds to complete blockchain transaction",
    "details": {
      "requiredGas": "0.0025 ETH",
      "availableBalance": "0.001 ETH",
      "walletAddress": "0x742d35Cc6669C58b4C94d5e77d3fDC9E4f9D8888"
    }
  }
}
```

### 409 Conflict - Certificate Already Exists

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_ALREADY_EXISTS",
    "message": "Certificate already issued for this exam session",
    "details": {
      "existingCertificateId": "507f1f77bcf86cd799439019",
      "tokenId": 1788,
      "issuedAt": "2025-09-20T15:30:00.000Z"
    }
  }
}
```
