// Jest setup file for Mainframe SDK tests

// Mock WebSocket for Node.js environment
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  send(data) {
    // Mock send - do nothing
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }
};

// Mock performance API for Node.js
if (!global.performance) {
  global.performance = {
    now: () => Date.now()
  };
}

// Mock localStorage for Node.js
if (!global.localStorage) {
  global.localStorage = {
    store: {},
    getItem: function(key) {
      return this.store[key] || null;
    },
    setItem: function(key, value) {
      this.store[key] = String(value);
    },
    removeItem: function(key) {
      delete this.store[key];
    },
    clear: function() {
      this.store = {};
    }
  };
}

// Mock fetch for testing
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('')
    })
  );
}

// Increase timeout for tests that involve crypto operations
jest.setTimeout(30000);

// Console warning filter
const originalWarn = console.warn;
console.warn = (...args) => {
  // Filter out crypto library warnings during tests
  if (args[0] && args[0].includes('crypto') && args[0].includes('warning')) {
    return;
  }
  originalWarn.apply(console, args);
};
