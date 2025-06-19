import { useState, useRef, useEffect } from 'react';
import { SSE } from 'sse.js';

/**
 * @typedef {Object} DataSource
 * @property {number} id - Unique identifier
 * @property {string} account_name - Display name of the data source
 * @property {string} type - Type of data source (e.g., 'POSTGRES', 'CLICKHOUSE')
 * @property {string} created_at - ISO date string of creation time
 * @property {boolean} is_fully_configured - Whether the data source is ready to use
 */

/**
 * @typedef {Object} ListDataSourcesOptions
 * @property {number} [page=1] - Page number to fetch
 * @property {number} [pageSize=20] - Number of items per page
 * @property {boolean} [fetchAll=false] - Whether to fetch all pages automatically
 */

/**
 * @typedef {Object} KnowledgeBase
 * @property {string} id - Knowledge base ID
 * @property {string} content - Knowledge base content
 * @property {Array<{account_name: string}>} [other_connections] - Other connections using this KB
 */

/**
 * @typedef {Object} ConnectionInfo
 * @property {string} id - Connection ID
 * @property {string} created_by - ID of user who created the connection
 * @property {string} account_name - Connection name
 */

/**
 * @typedef {Object} FeedbackData
 * @property {string} user_message - The user's message
 * @property {string} chat_bot_message - The bot's response
 * @property {string} message_id - Message ID
 * @property {string} thread_id - Thread ID
 * @property {string} [reason] - Reason for thumbs down (only for thumbs down)
 * @property {string} [details] - Additional details (only for thumbs down)
 */

/**
 * A stateful client for interacting with the CamelAI API and streaming endpoints.
 * Manages a JWT access token via a getter function and automatically includes it in request headers.
 */
export class CamelClient {
  /**
   * Creates a new CamelClient instance
   * @param {Function|string} accessTokenOrGetAccessToken - A function that returns the JWT access token string,
   *                                                        or a string token for backward compatibility.
   * @param {string} [baseUrl="https://api.camelai.com"] - Base URL for API requests.
   */
  constructor(accessTokenOrGetAccessToken, baseUrl = "https://api.camelai.com") {
    if (typeof accessTokenOrGetAccessToken === "function") {
      this.getAccessToken = accessTokenOrGetAccessToken;
    } else {
      this.getAccessToken = () => accessTokenOrGetAccessToken;
    }
    this.baseUrl = baseUrl;
    
    // Token caching
    this._cachedToken = null;
    this._tokenPromise = null;
  }

  /**
   * Update the JWT access token used for authentication.
   * @param {string} token - The new access token
   */
  setAccessToken(token) {
    this.getAccessToken = () => token;
    this._cachedToken = token; // Update cache
    this._tokenPromise = null; // Clear any pending promise
  }

  /**
   * Clear the cached token, forcing a fresh fetch on next request
   */
  clearTokenCache() {
    this._cachedToken = null;
    this._tokenPromise = null;
  }

  /**
   * Internal helper to get token with caching
   * @private
   * @returns {Promise<string>} The access token
   */
  async _getToken() {
    // Return cached token if available
    if (this._cachedToken) {
      return this._cachedToken;
    }

    // If there's already a fetch in progress, wait for it
    if (this._tokenPromise) {
      return this._tokenPromise;
    }

    // Start a new fetch and cache the promise
    this._tokenPromise = (async () => {
      try {
        const token = await this.getAccessToken();
        this._cachedToken = token;
        this._tokenPromise = null; // Clear the promise cache
        return token;
      } catch (error) {
        this._tokenPromise = null; // Clear the promise cache on error
        throw error;
      }
    })();

    return this._tokenPromise;
  }

  /**
   * Internal helper to build headers for JSON requests.
   * @private
   * @param {boolean} [json=true] - Whether to include JSON content-type header
   * @returns {Promise<Object>} Headers object
   */
  async _getHeaders(json = true) {
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    
    try {
      const token = await this._getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.warn('Failed to get access token:', error);
    }
    
    return headers;
  }

  // Chat-related API calls
  /**
   * Send a message to the chat API
   * @param {Object} payload - Message payload
   * @param {string} payload.message - The message content
   * @param {string} [payload.threadId] - Thread ID for continuing a conversation
   * @param {string} payload.model - The AI model to use
   * @param {string} payload.source_id - Data source ID
   * @returns {Promise<Object>} The API response
   * @throws {Error} If the request fails
   */
  async sendMessage(payload) {
    const response = await fetch(`${this.baseUrl}/api/sendMessage`, {
      method: 'POST',
      headers: await this._getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Cancel an active chat thread
   * @param {string} threadId - The thread ID to cancel
   * @returns {Promise<Object>} The API response
   * @throws {Error} If the request fails
   */
  async cancelChatThread(threadId) {
    const response = await fetch(`${this.baseUrl}/api/chat/${threadId}/cancel/`, {
      method: 'POST',
      headers: await this._getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to cancel chat thread: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Stream messages using Server-Sent Events
   * @param {Object} payload - Stream payload
   * @param {string} payload.message - The message content
   * @param {string} [payload.threadId] - Thread ID for continuing a conversation
   * @param {string} payload.model - The AI model to use
   * @param {string} payload.source_id - Data source ID
   * @param {boolean} [payload.stream=true] - Whether to stream responses
   * @param {boolean} [payload.autographMode] - Whether to generate graphs
   * @returns {Promise<SSE>} Server-Sent Events instance
   */
  async streamMessages(payload) {
    return new SSE(`${this.baseUrl}/api/v1/ask_camel`, {
      headers: await this._getHeaders(),
      payload: JSON.stringify(payload),
    });
  }

  /**
   * Fetch chat recommendations
   * @param {string|null} threadId - Thread ID for context-aware recommendations
   * @param {Array<string>} dataSources - Array of data source IDs
   * @returns {Promise<{suggestions: Array<string>}>} Recommendation suggestions
   * @throws {Error} If the request fails
   */
  async fetchRecommendations(threadId, dataSources) {
    // TODO: Remove this mock data when API endpoint is ready
    return {
      "suggestions": [
        "Recommendation 1",
        "Recommendation 2",
        "Recommendation 3",
      ]
    };
    /* Uncomment when API endpoint is ready:
    const endpoint = threadId
      ? `${this.baseUrl}/api/v1/chat/${threadId}/recommendations/`
      : `${this.baseUrl}/api/v1/chat/recommendations/`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: await this._getHeaders(),
      body: JSON.stringify({ dataSources }),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations: ${response.status} ${response.statusText}`);
    }
    return response.json();
    */
  }

  // Feedback API calls
  /**
   * Submit positive feedback for a message
   * @param {FeedbackData} data - Feedback data
   * @returns {Promise<Object>} The API response
   * @throws {Error} If the request fails
   */
  async submitThumbsUp(data) {
    const response = await fetch(`${this.baseUrl}/api/submit_thumbs_up/`, {
      method: 'POST',
      headers: await this._getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to submit thumbs up: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Submit negative feedback for a message
   * @param {FeedbackData} data - Feedback data including reason and details
   * @returns {Promise<Object>} The API response
   * @throws {Error} If the request fails
   */
  async submitThumbsDown(data) {
    const response = await fetch(`${this.baseUrl}/api/submit_thumbs_down/`, {
      method: 'POST',
      headers: await this._getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to submit thumbs down: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }


  /**
   * Fetch information about a specific connection
   * @param {string} connectionId - The connection ID
   * @returns {Promise<ConnectionInfo>} Connection information
   * @throws {Error} If the request fails
   */
  async fetchConnectionInfo(connectionId) {
    const response = await fetch(`${this.baseUrl}/api/connections/${connectionId}`, {
      headers: await this._getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch connection info: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch knowledge bases for a connection
   * @param {string} connectionId - The connection ID
   * @returns {Promise<{knowledge_bases: Array<KnowledgeBase>}>} Knowledge bases data
   * @throws {Error} If the request fails
   */
  async fetchKnowledgeBases(connectionId) {
    const response = await fetch(`${this.baseUrl}/connections/${connectionId}/knowledge-base`, {
      headers: await this._getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch knowledge bases: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Update knowledge bases for a connection
   * @param {string} connectionId - The connection ID
   * @param {Array<{id?: string, content: string}>} knowledgeBases - Knowledge bases to update
   * @returns {Promise<{knowledge_bases: Array<KnowledgeBase>}>} Updated knowledge bases
   * @throws {Error} If the request fails
   */
  async updateKnowledgeBases(connectionId, knowledgeBases) {
    const response = await fetch(`${this.baseUrl}/connections/${connectionId}/knowledge-base`, {
      method: 'POST',
      headers: await this._getHeaders(),
      body: JSON.stringify({ knowledge_bases: knowledgeBases }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update knowledge bases: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  // Data source API calls
  /**
   * List available data sources with pagination support
   * @param {ListDataSourcesOptions} [options={}] - Options for listing data sources
   * @returns {Promise<Array<DataSource>>} Array of all sources
   * @throws {Error} If the request fails
   * @example
   * // Get first page
   * const page1 = await client.listDataSources();
   * 
   * // Get all data sources
   * const allSources = await client.listDataSources({ fetchAll: true });
   * 
   * // Get specific page with custom size
   * const page2 = await client.listDataSources({ page: 2, pageSize: 10 });
   */
  async listDataSources(options = {}) {
    const { page = 1, pageSize = 20, fetchAll = false } = options;
    
    if (fetchAll) {
      // Fetch all pages using DRF pagination
      const allResults = [];
      let nextUrl = null;
      let currentPage = 1;
      
      // First request
      const firstData = await this.listDataSources({ page: currentPage, pageSize, fetchAll: false });
      allResults.push(...firstData.results);
      nextUrl = firstData.next;
      
      // Follow pagination links
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: await this._getHeaders(),
        });
        if (!response.ok) {
          throw new Error(`Failed to list data sources: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        allResults.push(...data.results);
        nextUrl = data.next;
      }
      
      return allResults;
    }
    
    // Fetch single page
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    
    const response = await fetch(`${this.baseUrl}/api/v1/sources/?${params}`, {
      headers: await this._getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to list data sources: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

}

/**
 * @typedef {Object} UseChatOptions
 * @property {CamelClient} client - CamelClient instance for API calls
 * @property {string|null} initialThreadId - Initial thread ID
 * @property {Array<Object>} initialMessages - Initial messages array
 * @property {string} model - AI model to use
 * @property {Array<string>} selectedDataSourcesIDs - Selected data source IDs
 * @property {Function} [onThreadCreated] - Callback when thread is created
 * @property {Function} [onThreadRenamed] - Callback when thread is renamed
 * @property {Function} [onStreamUpdate] - Callback on stream updates
 * @property {Function} [onStatusUpdate] - Callback on status updates
 */

/**
 * @typedef {Object} UseChatReturn
 * @property {Array<Object>} messages - Current messages array
 * @property {boolean} isStreaming - Whether currently streaming
 * @property {boolean} isLoading - Whether loading
 * @property {string|null} threadId - Current thread ID
 * @property {string|null} currentToolCall - Current tool being called
 * @property {Object|null} retryMessage - Message to retry on error
 * @property {Function} sendMessageToServer - Function to send messages
 * @property {Function} handleStopStreaming - Function to stop streaming
 */

/**
 * React hook for managing a chat thread via Server-Sent Events
 * @param {UseChatOptions} options - Hook options
 * @returns {UseChatReturn} Hook state and functions
 */
export function useChat({
  client,
  initialThreadId,
  initialMessages = [],
  model,
  selectedDataSourcesIDs,
  onThreadCreated,
  onThreadRenamed,
  onStreamUpdate,
  onStatusUpdate,
}) {
  const clientRef = useRef(client);
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const [messages, setMessages] = useState(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(initialThreadId);
  const [currentToolCall, setCurrentToolCall] = useState(null);
  const [retryMessage, setRetryMessage] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  /**
   * Send a message to the server
   * @param {string} message - Message content
   * @param {boolean} autograph - Whether to enable autograph mode
   */
  const sendMessageToServer = async (message, autograph) => {
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: message }]);
    setRetryMessage(null);
    setIsStreaming(true);
    setIsLoading(true);

    const payload = {
      threadId,
      model,
      message,
      source_id: selectedDataSourcesIDs[0],
      autographMode: autograph,
      stream: true,
    };

    try {
      const sse = await clientRef.current.streamMessages(payload);
      eventSourceRef.current = sse;

      sse.addEventListener('message', event => {
        setIsStreaming(true);
        try {
          if (!event.data) return;
          const dataObject = JSON.parse(event.data);
          setIsLoading(false);
          setMessages(prev => {
            const existingIndex = prev.findIndex(msg => msg.id === dataObject.id);
            if (existingIndex >= 0) {
              const newMessages = [...prev];
              newMessages[existingIndex] = dataObject;
              return newMessages;
            }
            return [...prev, dataObject];
          });
          onStreamUpdate?.();
        } catch (err) {
          console.warn('Failed to parse message data:', err);
        }
      });

      sse.addEventListener('status_update', event => {
        setIsStreaming(true);
        setIsLoading(false);
        let name;
        try {
          name = JSON.parse(event.data);
        } catch {
          name = event.data;
        }
        setCurrentToolCall(name);
        onStatusUpdate?.('status_update');
      });

      sse.addEventListener('clear_status', () => {
        setIsStreaming(true);
        setCurrentToolCall(null);
        setIsLoading(true);
        onStatusUpdate?.('clear_status');
      });

      sse.addEventListener('thread_created', event => {
        const { threadId } = JSON.parse(event.data);
        setThreadId(threadId);
      });

      sse.addEventListener('thread_renamed', event => {
        setIsStreaming(true);
        try {
          const { threadId: newThreadId, title } = JSON.parse(event.data);
          setThreadId(newThreadId);
          onThreadRenamed?.({ threadId: newThreadId, title });
        } catch (err) {
          console.warn('Failed to parse thread_renamed data:', err);
        }
      });

      sse.addEventListener('streamEnded', () => {
        setIsStreaming(false);
        setCurrentToolCall(null);
        setIsLoading(false);
        sse.close();
      });

      sse.addEventListener('serverError', event => {
        console.error('SSE error:', event);
        setRetryMessage({ message: 'continue', errorMessage: 'An unexpected error occurred. Please try again.' });
        setIsStreaming(false);
        setCurrentToolCall(null);
        setIsLoading(false);
        sse.close();
      });

      sse.onerror = error => console.error('SSE failed:', error);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      setIsLoading(false);
      setRetryMessage({ message, errorMessage: 'Failed to send message. Please try again.' });
    }
  };

  /**
   * Stop the current streaming session
   */
  const handleStopStreaming = async () => {
    if (!threadId) return;
    try {
      await clientRef.current.cancelChatThread(threadId);
    } catch (err) {
      console.error('Error cancelling thread:', err);
    }
  };

  return {
    messages,
    isStreaming,
    isLoading,
    threadId,
    currentToolCall,
    retryMessage,
    sendMessageToServer,
    handleStopStreaming,
  };
}