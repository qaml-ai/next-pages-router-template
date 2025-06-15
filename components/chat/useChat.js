import { useState, useRef, useEffect } from 'react';
import { sendMessage, cancelChatThread } from '../api';

export function useChat({ 
    initialThreadId,
    initialMessages = [],
    model, 
    selectedDataSourcesIDs,
    onThreadCreated,
    onThreadRenamed,
    onStreamUpdate,
    onStatusUpdate
}) {
    const [messages, setMessages] = useState(initialMessages);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [threadId, setThreadId] = useState(initialThreadId);
    const [currentToolCall, setCurrentToolCall] = useState(null);
    const [retryMessage, setRetryMessage] = useState(null);
    
    const eventSourceRef = useRef(null);
    const isStreamingRef = useRef(isStreaming);

    useEffect(() => {
        isStreamingRef.current = isStreaming;
    }, [isStreaming]);

    const connectToSSE = () => {
        if (!threadId) return;
        const eventSource = new EventSource(`/api/chat/${threadId}/sse`);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('message', (event) => {
            setIsStreaming(true);
            try {
                if (!event.data) return;
                const dataObject = JSON.parse(event.data);
                setIsLoading(false);
                setMessages(prev => {
                    const newMessage = dataObject;
                    const existingIndex = prev.findIndex(msg => msg.id === dataObject.id);
                    if (existingIndex >= 0) {
                        const newMessages = [...prev];
                        newMessages[existingIndex] = newMessage;
                        return newMessages;
                    }
                    return [...prev, newMessage];
                });
                // Notify parent component about stream update
                if (onStreamUpdate) {
                    onStreamUpdate();
                }
            } catch (error) {
                console.warn('Failed to parse message data:', error);
            }
        });

        eventSource.addEventListener('status_update', (event) => {
            setIsStreaming(true);
            setIsLoading(false);
            let name;
            try {
                name = JSON.parse(event.data);
            } catch (_) {
                name = event.data;
            }
            setCurrentToolCall(name);
            // Notify parent component about status update
            if (onStatusUpdate) {
                onStatusUpdate('status_update');
            }
        });

        eventSource.addEventListener('clear_status', () => {
            setIsStreaming(true);
            setCurrentToolCall(null);
            setIsLoading(true);
            // Notify parent component about status clear
            if (onStatusUpdate) {
                onStatusUpdate('clear_status');
            }
        });

        eventSource.addEventListener('thread_renamed', (event) => {
            setIsStreaming(true);
            try {
                if (!event.data) return;
                const { threadId, title } = JSON.parse(event.data);
                if (onThreadRenamed) {
                    onThreadRenamed({ threadId, title });
                }
            } catch (error) {
                console.warn('Failed to parse thread_renamed data:', error);
            }
        });

        eventSource.addEventListener('streamEnded', () => {
            console.log('streamEnded');
            setIsStreaming(false);
            setCurrentToolCall(null);
            setIsLoading(false);
        });

        eventSource.addEventListener('serverError', (event) => {
            console.error('EventSource failed:', event);
            if (isStreamingRef.current) {
                setRetryMessage({
                    message: 'continue',
                    errorMessage: 'An unexpected error occurred. Please try again.'
                });
            }
            setIsStreaming(false);
            setCurrentToolCall(null);
            setIsLoading(false);
        });

        eventSource.onerror = async (error) => {
            console.error('EventSource failed:', error);
        };
    };

    useEffect(() => {
        if (threadId) {
            connectToSSE();
        }
        
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [threadId]);

    const sendMessageToServer = async (message, autograph) => {
        // Add user message immediately for instant feedback
        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, { id: tempId, role: 'user', content: message }]);
        
        setRetryMessage(null);
        setIsStreaming(true);
        setIsLoading(true);

        const payload = {
            threadId,
            model,
            message,
            selectedSources: selectedDataSourcesIDs,
            autographMode: autograph,
        };
        
        try {
            const response = await sendMessage(payload);
            
            if (!response.ok) {
                if (response.status === 402) {
                    console.error('paywall triggered');
                    htmx.trigger('#paywall-modal-content', 'showPaywall');
                    setRetryMessage({
                        message: message,
                        errorMessage: 'You have reached your free message limit.'
                    });
                    setIsStreaming(false);
                    setIsLoading(false);
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            const data = await response.json();
            
            if (!threadId) {
                setThreadId(data.threadId);
                if (onThreadCreated) {
                    onThreadCreated({ threadId: data.threadId });
                }
            }
            
            if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
                connectToSSE();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setIsStreaming(false);
            setIsLoading(false);
            setRetryMessage({
                message: message,
                errorMessage: 'Failed to send message. Please try again.'
            });
        }
    };

    const handleStopStreaming = async () => {
        if (!threadId) return;

        try {
            const response = await cancelChatThread(threadId);

            if (!response.ok) {
                console.error('Failed to cancel thread:', response.statusText);
            }
        } catch (error) {
            console.error('Error cancelling thread:', error);
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