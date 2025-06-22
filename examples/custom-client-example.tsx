import React from 'react';
import Index from '../pages/index';
import { CamelClient } from '../components/camelClient';
const SSE = require('sse.js');

// Example 1: Mock client for development
class MockCamelClient extends CamelClient {
  constructor() {
    super(() => 'mock-token', 'http://localhost:3001');
  }

  async sendMessage(payload: any) {
    console.log('Mock sendMessage called:', payload);
    return { success: true, message: 'Mock response' };
  }

  async streamMessages(payload: any): Promise<any> {
    console.log('Mock streamMessages called:', payload);
    // Return a mock SSE instance
    const mockSSE = new SSE('mock://url', {
      headers: {},
      payload: JSON.stringify(payload)
    });
    
    // Override the stream method to simulate events
    mockSSE.stream = () => {
      setTimeout(() => {
        if (mockSSE.onmessage) {
          mockSSE.onmessage({
            id: 'mock-1',
            data: JSON.stringify({
              id: 'mock-1',
              role: 'assistant',
              content: 'This is a mock response!',
            }),
          } as any);
        }
        // Simulate stream end
        mockSSE.close();
      }, 1000);
    };
    
    // Auto-start the stream
    setTimeout(() => mockSSE.stream(), 0);
    
    return mockSSE;
  }
}

// Example 2: Client with custom baseUrl for local development
const devClient = new CamelClient(
  async () => {
    // Custom token fetching logic
    const response = await fetch('/api/dev-token');
    return response.text();
  },
  'http://localhost:8000' // Local backend URL
);

// Example 3: Client with additional logging
class LoggingCamelClient extends CamelClient {
  async sendMessage(payload: any) {
    console.log('[CamelClient] Sending message:', payload);
    const result = await super.sendMessage(payload);
    console.log('[CamelClient] Response:', result);
    return result;
  }

  async streamMessages(payload: any): Promise<any> {
    console.log('[CamelClient] Starting stream:', payload);
    return super.streamMessages(payload);
  }
}

// Usage in your app:
export function DevelopmentApp() {
  const mockClient = new MockCamelClient();
  
  return (
    <Index
      initialMessages={[]}
      availableModels={{ 'gpt-4': { name: 'GPT-4' } }}
      connectedApps={[]}
      threadID={null}
      modelOverride={null}
      selectedDataSource={null}
      userData={{ name: 'Test User' }}
      clientOverride={mockClient}
      dataSources={[]}
    />
  );
}

// For testing with a custom base URL:
export function LocalBackendApp() {
  return (
    <Index
      initialMessages={[]}
      availableModels={{ 'gpt-4': { name: 'GPT-4' } }}
      connectedApps={[]}
      threadID={null}
      modelOverride={null}
      selectedDataSource={null}
      userData={{ name: 'Test User' }}
      clientOverride={devClient}
      dataSources={[]}
    />
  );
}