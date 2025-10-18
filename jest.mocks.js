// Jest mocks for external dependencies

// Mock IPFS HTTP Client
const mockIPFS = {
  create: jest.fn(() => ({
    add: jest.fn().mockResolvedValue({ cid: { toString: () => 'QmMockHash' } }),
    get: jest.fn(),
    pin: { add: jest.fn() }
  }))
};

// Mock Arweave
const mockArweaveInstance = {
  createTransaction: jest.fn().mockResolvedValue({
    id: 'mock-tx-id',
    addTag: jest.fn()
  }),
  transactions: {
    post: jest.fn().mockResolvedValue(true)
  }
};

const mockArweave = {
  init: jest.fn(() => mockArweaveInstance)
};

module.exports = {
  create: mockIPFS.create,
  default: mockArweave
};
