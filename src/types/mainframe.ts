/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/mainframe.json`.
 */
export type Mainframe = {
  "address": "4J4xEFhpn2r7rRiEiazBd1K8JThUM13J6uRL6gcaankU",
  "metadata": {
    "name": "mainframe",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addPartnerCollection",
      "docs": [
        "Add partner collection"
      ],
      "discriminator": [
        253,
        201,
        44,
        172,
        58,
        43,
        107,
        221
      ],
      "accounts": [
        {
          "name": "partnerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  114,
                  116,
                  110,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "collectionMint"
              }
            ]
          }
        },
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "collection",
          "type": "pubkey"
        },
        {
          "name": "discountPercent",
          "type": "u8"
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "closeAgent",
      "docs": [
        "Close agent permanently"
      ],
      "discriminator": [
        52,
        185,
        104,
        145,
        157,
        30,
        87,
        237
      ],
      "accounts": [
        {
          "name": "agentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent_account.nft_mint",
                "account": "agentAccount"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeAgentAccount",
      "docs": [
        "Close agent account and recover rent (Protocol only)"
      ],
      "discriminator": [
        142,
        71,
        98,
        88,
        29,
        154,
        41,
        115
      ],
      "accounts": [
        {
          "name": "agentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent_account.nft_mint",
                "account": "agentAccount"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Protocol authority that can close accounts for rent recovery"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "docs": [
            "Protocol configuration to validate authority"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rentReceiver",
          "docs": [
            "Account that receives the recovered rent (protocol treasury)"
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createAgent",
      "docs": [
        "Create new agent from NFT"
      ],
      "discriminator": [
        143,
        66,
        198,
        95,
        110,
        85,
        83,
        249
      ],
      "accounts": [
        {
          "name": "agentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolAuthority",
          "docs": [
            "Protocol authority that pays for account creation (for rent recovery)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "NFT token account owned by the user"
          ]
        },
        {
          "name": "nftMetadata",
          "docs": [
            "NFT metadata account"
          ]
        },
        {
          "name": "protocolConfig",
          "docs": [
            "Protocol configuration"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "protocolTreasury",
          "docs": [
            "Fee distribution accounts"
          ],
          "writable": true
        },
        {
          "name": "validatorTreasury",
          "writable": true
        },
        {
          "name": "networkTreasury",
          "writable": true
        },
        {
          "name": "seller",
          "docs": [
            "Optional seller account that receives affiliate fee",
            "Can have zero balance - Solana allows transfers to any account passed in transaction"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "partnerAccount",
          "docs": [
            "Optional partner collection account for discount validation"
          ],
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nftMint",
          "type": "pubkey"
        },
        {
          "name": "metadataUri",
          "type": "string"
        },
        {
          "name": "sellerAffiliateBps",
          "type": "u16"
        },
        {
          "name": "collectionMint",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "initializeConfig",
      "docs": [
        "Initialize protocol configuration"
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fees",
          "type": {
            "defined": {
              "name": "feeStructure"
            }
          }
        },
        {
          "name": "protocolTreasury",
          "type": "pubkey"
        },
        {
          "name": "validatorTreasury",
          "type": "pubkey"
        },
        {
          "name": "networkTreasury",
          "type": "pubkey"
        },
        {
          "name": "protocolTreasuryBps",
          "type": "u16"
        },
        {
          "name": "validatorTreasuryBps",
          "type": "u16"
        },
        {
          "name": "networkTreasuryBps",
          "type": "u16"
        },
        {
          "name": "maxPartnerCollections",
          "type": "u64"
        },
        {
          "name": "maxAffiliateBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "pause",
      "docs": [
        "Pause/unpause protocol"
      ],
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "pauseAgent",
      "docs": [
        "Pause or resume agent"
      ],
      "discriminator": [
        148,
        32,
        1,
        26,
        147,
        122,
        178,
        140
      ],
      "accounts": [
        {
          "name": "agentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent_account.nft_mint",
                "account": "agentAccount"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "removePartnerCollection",
      "docs": [
        "Remove partner collection"
      ],
      "discriminator": [
        159,
        200,
        114,
        198,
        6,
        116,
        224,
        236
      ],
      "accounts": [
        {
          "name": "partnerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  114,
                  116,
                  110,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "collectionMint"
              }
            ]
          }
        },
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "collection",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "transferAgent",
      "docs": [
        "Transfer agent ownership"
      ],
      "discriminator": [
        137,
        80,
        56,
        147,
        107,
        99,
        39,
        192
      ],
      "accounts": [
        {
          "name": "agentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent_account.nft_mint",
                "account": "agentAccount"
              }
            ]
          }
        },
        {
          "name": "currentOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "newNftTokenAccount",
          "docs": [
            "New NFT token account (owned by new_owner)"
          ]
        },
        {
          "name": "newOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "protocolTreasury",
          "docs": [
            "Fee distribution accounts"
          ],
          "writable": true
        },
        {
          "name": "validatorTreasury",
          "writable": true
        },
        {
          "name": "networkTreasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateAgentConfig",
      "docs": [
        "Update agent configuration"
      ],
      "discriminator": [
        232,
        239,
        83,
        133,
        24,
        49,
        84,
        76
      ],
      "accounts": [
        {
          "name": "agentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent_account.nft_mint",
                "account": "agentAccount"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "protocolTreasury",
          "docs": [
            "Fee distribution accounts"
          ],
          "writable": true
        },
        {
          "name": "validatorTreasury",
          "writable": true
        },
        {
          "name": "networkTreasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newMetadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateAuthority",
      "docs": [
        "Update protocol authority"
      ],
      "discriminator": [
        32,
        46,
        64,
        28,
        149,
        75,
        243,
        88
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateFees",
      "docs": [
        "Update fee structure"
      ],
      "discriminator": [
        225,
        27,
        13,
        6,
        69,
        84,
        172,
        191
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newFees",
          "type": {
            "defined": {
              "name": "feeStructure"
            }
          }
        }
      ]
    },
    {
      "name": "updateProtocolLimits",
      "docs": [
        "Update protocol limits"
      ],
      "discriminator": [
        93,
        218,
        165,
        44,
        238,
        224,
        119,
        166
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "maxPartnerCollections",
          "type": "u64"
        },
        {
          "name": "maxAffiliateBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "updateTreasuryDistribution",
      "docs": [
        "Update treasury distribution"
      ],
      "discriminator": [
        155,
        122,
        211,
        97,
        193,
        145,
        194,
        166
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "protocolTreasuryBps",
          "type": "u16"
        },
        {
          "name": "validatorTreasuryBps",
          "type": "u16"
        },
        {
          "name": "networkTreasuryBps",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agentAccount",
      "discriminator": [
        241,
        119,
        69,
        140,
        233,
        9,
        112,
        50
      ]
    },
    {
      "name": "partnerCollectionAccount",
      "discriminator": [
        239,
        239,
        19,
        86,
        52,
        169,
        101,
        169
      ]
    },
    {
      "name": "protocolConfig",
      "discriminator": [
        207,
        91,
        250,
        28,
        152,
        179,
        215,
        209
      ]
    }
  ],
  "events": [
    {
      "name": "affiliatePaid",
      "discriminator": [
        23,
        62,
        238,
        53,
        254,
        32,
        36,
        32
      ]
    },
    {
      "name": "agentAccountClosed",
      "discriminator": [
        16,
        48,
        148,
        81,
        34,
        222,
        87,
        149
      ]
    },
    {
      "name": "agentClosed",
      "discriminator": [
        72,
        133,
        207,
        59,
        220,
        188,
        201,
        165
      ]
    },
    {
      "name": "agentCreated",
      "discriminator": [
        237,
        44,
        61,
        111,
        90,
        251,
        241,
        34
      ]
    },
    {
      "name": "agentPaused",
      "discriminator": [
        228,
        35,
        167,
        28,
        96,
        5,
        210,
        82
      ]
    },
    {
      "name": "agentResumed",
      "discriminator": [
        138,
        191,
        50,
        131,
        92,
        153,
        211,
        143
      ]
    },
    {
      "name": "agentTransferred",
      "discriminator": [
        5,
        213,
        4,
        28,
        147,
        238,
        64,
        57
      ]
    },
    {
      "name": "agentUpdated",
      "discriminator": [
        210,
        179,
        162,
        250,
        123,
        250,
        210,
        166
      ]
    }
  ],
  "errors": [
    {
      "code": 12000,
      "name": "nftNotOwned",
      "msg": "NFT not owned by the signer"
    },
    {
      "code": 12001,
      "name": "metadataTooLarge",
      "msg": "Agent metadata exceeds maximum size"
    },
    {
      "code": 12002,
      "name": "agentNotActive",
      "msg": "Agent is not active"
    },
    {
      "code": 12003,
      "name": "insufficientFee",
      "msg": "Insufficient fee payment"
    },
    {
      "code": 12004,
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 12005,
      "name": "unauthorized",
      "msg": "Unauthorized operation"
    },
    {
      "code": 12006,
      "name": "agentAlreadyExists",
      "msg": "Agent already exists for this NFT"
    },
    {
      "code": 12007,
      "name": "invalidNftMetadata",
      "msg": "Invalid NFT metadata"
    },
    {
      "code": 12008,
      "name": "versionOverflow",
      "msg": "Version counter overflow"
    },
    {
      "code": 12009,
      "name": "counterOverflow",
      "msg": "Total agents counter overflow"
    },
    {
      "code": 12010,
      "name": "collectionAlreadyExists",
      "msg": "Collection already exists in partner list"
    },
    {
      "code": 12011,
      "name": "collectionNotFound",
      "msg": "Collection not found in partner list"
    },
    {
      "code": 12012,
      "name": "agentAlreadyClosed",
      "msg": "Agent is already closed"
    },
    {
      "code": 12013,
      "name": "invalidMetadataUri",
      "msg": "Invalid or empty metadata URI"
    },
    {
      "code": 12014,
      "name": "invalidDiscountPercent",
      "msg": "Invalid discount percentage (must be 0-100)"
    },
    {
      "code": 12015,
      "name": "invalidTreasuryDistribution",
      "msg": "Treasury distribution basis points must sum to 10,000 (100%)"
    },
    {
      "code": 12016,
      "name": "unauthorizedCpi",
      "msg": "Cross-program invocation unauthorized"
    },
    {
      "code": 12017,
      "name": "invalidUriFormat",
      "msg": "Metadata URI format invalid or exceeds length limit"
    },
    {
      "code": 12018,
      "name": "partnerCollectionLimitExceeded",
      "msg": "Partner collection limit exceeded"
    },
    {
      "code": 12019,
      "name": "invalidAccountRelationship",
      "msg": "Account relationship validation failed"
    },
    {
      "code": 12020,
      "name": "agentNotClosed",
      "msg": "Agent is not closed - cannot recover rent"
    },
    {
      "code": 12021,
      "name": "insufficientBalance",
      "msg": "Insufficient balance for fee payment"
    },
    {
      "code": 12022,
      "name": "invalidAffiliate",
      "msg": "Invalid affiliate percentage (must be 0-5000 bps, max 50%)"
    }
  ],
  "types": [
    {
      "name": "affiliatePaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "affiliateAmount",
            "type": "u64"
          },
          {
            "name": "affiliateBps",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "docs": [
              "The NFT mint associated with this agent"
            ],
            "type": "pubkey"
          },
          {
            "name": "owner",
            "docs": [
              "The owner of the NFT and agent"
            ],
            "type": "pubkey"
          },
          {
            "name": "collectionMint",
            "docs": [
              "The collection this NFT belongs to"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "metadataUri",
            "docs": [
              "URI pointing to secure JSON metadata"
            ],
            "type": "string"
          },
          {
            "name": "status",
            "docs": [
              "Agent operational status"
            ],
            "type": {
              "defined": {
                "name": "agentStatus"
              }
            }
          },
          {
            "name": "activatedAt",
            "docs": [
              "Timestamp of activation"
            ],
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "docs": [
              "Last update timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "version",
            "docs": [
              "Version for configuration updates"
            ],
            "type": "u64"
          },
          {
            "name": "seller",
            "docs": [
              "Seller who receives commission (if any)"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "agentAccountClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "rentRecovered",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "collectionMint",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "metadataUri",
            "type": "string"
          },
          {
            "name": "seller",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "version",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "agentPaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentResumed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "paused"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "agentTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "oldOwner",
            "type": "pubkey"
          },
          {
            "name": "newOwner",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentAccount",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "metadataUri",
            "type": "string"
          },
          {
            "name": "oldVersion",
            "type": "u64"
          },
          {
            "name": "newVersion",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "feeStructure",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "createAgent",
            "type": "u64"
          },
          {
            "name": "updateConfig",
            "type": "u64"
          },
          {
            "name": "transferAgent",
            "type": "u64"
          },
          {
            "name": "pauseAgent",
            "type": "u64"
          },
          {
            "name": "closeAgent",
            "type": "u64"
          },
          {
            "name": "executeAction",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "partnerCollectionAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collectionMint",
            "type": "pubkey"
          },
          {
            "name": "discountPercent",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "addedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "protocolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Protocol authority"
            ],
            "type": "pubkey"
          },
          {
            "name": "fees",
            "docs": [
              "Fee structure"
            ],
            "type": {
              "defined": {
                "name": "feeStructure"
              }
            }
          },
          {
            "name": "protocolTreasury",
            "docs": [
              "Fee distribution accounts"
            ],
            "type": "pubkey"
          },
          {
            "name": "validatorTreasury",
            "type": "pubkey"
          },
          {
            "name": "networkTreasury",
            "type": "pubkey"
          },
          {
            "name": "protocolTreasuryBps",
            "docs": [
              "Fee distribution in basis points"
            ],
            "type": "u16"
          },
          {
            "name": "validatorTreasuryBps",
            "type": "u16"
          },
          {
            "name": "networkTreasuryBps",
            "type": "u16"
          },
          {
            "name": "paused",
            "docs": [
              "Emergency pause status"
            ],
            "type": "bool"
          },
          {
            "name": "totalAgents",
            "docs": [
              "Total agents activated"
            ],
            "type": "u64"
          },
          {
            "name": "totalPartners",
            "docs": [
              "Total partner collections (stored in separate PDAs)"
            ],
            "type": "u64"
          },
          {
            "name": "maxPartnerCollections",
            "docs": [
              "Maximum number of partner collections allowed"
            ],
            "type": "u64"
          },
          {
            "name": "maxAffiliateBps",
            "docs": [
              "Maximum affiliate commission in basis points (default: 5000 = 50%)"
            ],
            "type": "u16"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades"
            ],
            "type": {
              "array": [
                "u8",
                54
              ]
            }
          }
        ]
      }
    }
  ]
};
