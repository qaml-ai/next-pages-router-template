import { useState, useRef, useEffect } from 'react';
import { SSE } from 'sse.js';

/**
 * A stateful client for interacting with the CamelAI API and streaming endpoints.
 * Manages a JWT access token via a getter function and automatically includes it in request headers.
 */
export class CamelClient {
  /**
   * @param accessTokenOrGetAccessToken A function that returns the JWT access token string,
   *                                     or a string token for backward compatibility.
   * @param baseUrl Base URL for API requests.
   */
  constructor(accessTokenOrGetAccessToken, baseUrl = "https://api.camelai.com") {
    if (typeof accessTokenOrGetAccessToken === "function") {
      this.getAccessToken = accessTokenOrGetAccessToken;
    } else {
      this.getAccessToken = () => accessTokenOrGetAccessToken;
    }
    this.baseUrl = baseUrl;
  }

  /** Update the JWT access token used for authentication. */
  setAccessToken(token) {
    this.getAccessToken = () => token;
  }

  /** Internal helper to build headers for JSON requests. */
  _getHeaders(json = true) {
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    const token = this.getAccessToken && this.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // Dashboard-related API calls
  fetchAvailableDashboards() {
    return fetch(`${this.baseUrl}/dashboards/api/available`, {
      headers: this._getHeaders(),
    });
  }

  checkArtifactCompatibility(dashboardId, artifactId) {
    return fetch(`${this.baseUrl}/dashboards/check-artifact-compatibility/`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ dashboard_id: dashboardId, artifact_id: artifactId }),
    });
  }

  addArtifactToDashboard(dashboardId, artifactId) {
    return fetch(`${this.baseUrl}/dashboards/${dashboardId}/add_artifact/${artifactId}/`, {
      method: 'POST',
      headers: this._getHeaders(),
    });
  }

  createDashboard(title, artifactId) {
    return fetch(`${this.baseUrl}/dashboards/new/`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ title, artifact_id: artifactId }),
    });
  }

  // Thread history clearing
  deleteAllThreads() {
    return fetch(`${this.baseUrl}/delete_all_threads/`, {
      method: 'POST',
      headers: this._getHeaders(),
      credentials: 'include',
    });
  }

  // Chat-related API calls
  sendMessage(payload) {
    return fetch(`${this.baseUrl}/api/sendMessage`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(payload),
    });
  }

  cancelChatThread(threadId) {
    return fetch(`${this.baseUrl}/api/chat/${threadId}/cancel/`, {
      method: 'POST',
      headers: this._getHeaders(),
    });
  }

  streamMessages(payload) {
    return new SSE(`${this.baseUrl}/api/v1/ask_camel`, {
      headers: this._getHeaders(),
      payload: JSON.stringify(payload),
    });
  }

  fetchRecommendations(threadId, dataSources) {
    const endpoint = threadId
      ? `${this.baseUrl}/api/chat/${threadId}/recommendations/`
      : `${this.baseUrl}/api/chat/recommendations/`;
    return fetch(endpoint, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ dataSources }),
    });
  }

  // Feedback API calls
  submitThumbsUp(data) {
    return fetch(`${this.baseUrl}/api/submit_thumbs_up/`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(data),
    });
  }

  submitThumbsDown(data) {
    return fetch(`${this.baseUrl}/api/submit_thumbs_down/`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(data),
    });
  }

  // Knowledge base API calls
  fetchCurrentUserInfo() {
    return fetch(`${this.baseUrl}/api/current-user-info`, {
      headers: this._getHeaders(),
    });
  }

  fetchConnectionInfo(connectionId) {
    return fetch(`${this.baseUrl}/api/connections/${connectionId}`, {
      headers: this._getHeaders(),
    });
  }

  fetchKnowledgeBases(connectionId) {
    return fetch(`${this.baseUrl}/connections/${connectionId}/knowledge-base`, {
      headers: this._getHeaders(),
    });
  }

  updateKnowledgeBases(connectionId, knowledgeBases) {
    return fetch(`${this.baseUrl}/connections/${connectionId}/knowledge-base`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ knowledge_bases: knowledgeBases }),
    });
  }

}

/**
 * A React hook for managing chat threads via Server-Sent Events (SSE).
 * Delegates network calls to an instance of CamelClient.
 */
/**
 * React hook for managing a chat thread via SSE.
 * @param client CamelClient instance used for all requests and streaming.
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
      source_id: 1,
      autographMode: autograph,
      stream: true,
    };

    try {
      const sse = clientRef.current.streamMessages(payload);
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

  const handleStopStreaming = async () => {
    if (!threadId) return;
    try {
      const response = await clientRef.current.cancelChatThread(threadId);
      if (!response.ok) console.error('Failed to cancel thread:', response.statusText);
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