import React, { useState, useRef, useEffect, useMemo } from 'react';

// Import child components
import ChatMessage from './ChatMessage';
import ChatMessageBottomBar from './ChatMessageBottomBar';
import ArtifactPane from '../artifact/ArtifactPane';

import { useChat } from '../camelClient';

// Import Heroicons
// Outline icons
import {
    XMarkIcon,
    BookOpenIcon,
    PlusCircleIcon,
    ChartBarIcon,
    CheckIcon,
    ChevronUpIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
// Filled (solid) icons
import {
    StopCircleIcon as StopCircleIconSolid,
    ArrowUpCircleIcon as ArrowUpCircleIconSolid,
    ChartBarIcon as ChartBarIconSolid,
} from '@heroicons/react/24/solid';

import { CamelClient } from '../camelClient';

function App({ 
  getAccessToken, 
  connectedApps, 
  availableModels, 
  initialMessages, 
  threadID, 
  modelOverride, 
  selectedDataSource, 
  userData, 
  clientOverride,
  onThreadChanged 
}) {
    const prevMessages = useRef([]);
    const [inputMessage, setInputMessage] = useState('');
    const chatContainerRef = useRef(null);
    const [threadData, setThreadData] = useState(null);
    const [model, setModel] = useState(() => {
        if (modelOverride && availableModels[modelOverride]) {
            return modelOverride;
        }
        // Check thread ID or localStorage
        // Since we don't have thread data yet, skip thread model check
        if (localStorage.getItem('lastSelectedModel') && availableModels[localStorage.getItem('lastSelectedModel')]) {
            return localStorage.getItem('lastSelectedModel');
        } else {
            return Object.keys(availableModels)[0];
        }
    });
    const textareaRef = useRef(null);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [selectedDataSourcesIDs, setSelectedDataSourcesIDs] = useState([]);
    const [autographMode, setAutographMode] = useState();

    // -------------- scroll to bottom stuff
    // Add helper function to check if user is near bottom
    const isNearBottom = (duringToolCall = false) => {
        if (!chatContainerRef.current) return true;
        const container = chatContainerRef.current;
        const threshold = duringToolCall ? 200 : 100; // pixels from bottom
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceFromBottom <= threshold;
    };

    // Modify scrollToBottom to handle forced scrolls
    const scrollToBottom = (force = false) => {
        if (chatContainerRef.current && (force || isNearBottom())) {
            setTimeout(() => {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }, 0);
        }
    };

    // Create camelClient instance with useMemo to persist across renders
    // Token caching is now handled inside the CamelClient itself
    const client = useMemo(() => clientOverride || new CamelClient(getAccessToken), [clientOverride, getAccessToken]);

    // Use the custom hook
    const {
        messages,
        isStreaming,
        isLoading,
        threadId,
        currentToolCall,
        retryMessage,
        sendMessageToServer,
        handleStopStreaming,
    } = useChat({
        client,
        initialThreadId: threadID || null,
        initialMessages,
        model,
        selectedDataSourcesIDs,
        onThreadCreated: ({ threadId }) => {
            const newEvent = new CustomEvent('threadCreated', { detail: { threadId } });
            window.dispatchEvent(newEvent);
            onThreadChanged?.({ threadId });
        },
        onThreadRenamed: ({ threadId, title }) => {
            window.dispatchEvent(new CustomEvent('threadRenamed', { detail: { threadId, title } }));
        },
        onStreamUpdate: () => {
            // Handle scroll on new message chunks
            if (isNearBottom()) {
                scrollToBottom();
            }
        },
        onStatusUpdate: (type) => {
            // Handle scroll on status updates
            if (isNearBottom()) {
                scrollToBottom();
            }
        },
        onThreadDataFetched: (data) => {
            if (data.thread) {
                setThreadData(data.thread);
                if (data.thread.model && availableModels[data.thread.model]) {
                    setModel(data.thread.model);
                }
                if (data.thread.connection_ids?.length > 0) {
                    setSelectedDataSourcesIDs(data.thread.connection_ids);
                }
            }
        },
    });

    const userMessages = useMemo(() => messages.filter(msg => msg.role === 'user').reverse(), [messages]);

    useEffect(() => {
        // Since we don't have thread data yet, skip connection_ids check
        if (selectedDataSource) {
            setSelectedDataSourcesIDs([selectedDataSource]);
        } else {
            const saved = localStorage.getItem(`dataSources_null`);
            setSelectedDataSourcesIDs(saved ? JSON.parse(saved) : connectedApps[0]?.id ? [connectedApps[0].id] : []);
        }
    }, []);

    useEffect(() => {
        if (selectedDataSourcesIDs.length > 0) localStorage.setItem(`dataSources_null`, JSON.stringify(selectedDataSourcesIDs));
    }, [selectedDataSourcesIDs]);

    const selectedDataSources = connectedApps.filter(app => selectedDataSourcesIDs.includes(app.id));
    const isThreadLocked = !!threadId;
    // New state to track expanded/collapsed state for tool message groups
    const [expandedGroups, setExpandedGroups] = useState({});
    // Add state for model switcher dropdown
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const modelMenuRef = useRef(null);

    useEffect(() => {
        const stored = localStorage.getItem('autographMode');
        setAutographMode(stored ? stored === 'true' : true);
    }, []);

    useEffect(() => {
        if (autographMode !== undefined) localStorage.setItem('autographMode', JSON.stringify(autographMode));
    }, [autographMode]);

    // Effect to update lastSelectedModel in localstorage when model changes
    useEffect(() => {
        localStorage.setItem('lastSelectedModel', model);
    }, [model]);

    // Transform messages by splitting those with 'think' tool use parts
    const transformedMessages = useMemo(() => {
        const result = [];

        messages.forEach(message => {
            // If content is a string, add with _part_0 postfix
            if (typeof message.content === 'string') {
                result.push({
                    ...message,
                    id: `${message.id}_part_0`
                });
                return;
            }

            // If content is an array, check if it contains 'think' tool use
            if (Array.isArray(message.content)) {
                const hasThinkToolUse = message.content.some(part =>
                    part?.type === 'tool_use' && part?.name === 'think'
                );

                if (hasThinkToolUse) {
                    // Split each content part into separate messages
                    message.content.forEach((part, index) => {
                        result.push({
                            ...message,
                            id: `${message.id}_part_${index}`,
                            content: [part]
                        });
                    });
                } else {
                    // No think tool use, add message with _part_0 postfix
                    result.push({
                        ...message,
                        id: `${message.id}_part_0`
                    });
                }
            } else {
                // Content is neither string nor array, add with _part_0 postfix
                result.push({
                    ...message,
                    id: `${message.id}_part_0`
                });
            }
        });

        return result;
    }, [messages]);

    // Group messages by consecutive role
    const groupedMessages = useMemo(() => {
        const groups = [];

        const messageContainsToolCalls = (message) => {
            if (typeof message.content === 'string') {
                return false;
            }
            return message.content.some(part => part?.type === 'tool_use');
        };

        transformedMessages.forEach(message => {
            const role = message.role;
            let lastGroup = groups[groups.length - 1];
            if (!lastGroup || lastGroup.role !== role) {
                lastGroup = {
                    id: message.id,
                    tool_messages: [],
                    final_message: null,
                    role: role
                };
                groups.push(lastGroup);
            }
            if (messageContainsToolCalls(message)) {
                lastGroup.tool_messages.push(message);
            } else {
                lastGroup.final_message = message;
            }
        });
        return groups;
    }, [transformedMessages]);

    const [isDataSourceMenuOpen, setIsDataSourceMenuOpen] = useState(false);
    const dataSourceMenuRef = useRef(null);
    // Chat recommendations
    const [recommendations, setRecommendations] = useState([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const artifacts = useMemo(() => messages.flatMap(msg => msg.artifacts).filter(Boolean).reverse(), [messages]);

    useEffect(() => {
        window.copyCode = (codeBlock) => {
            const copyMessage = codeBlock.querySelector('.copy-message');
            const code = codeBlock.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                copyMessage.style.visibility = 'visible';  // Show "Copied" message
                setTimeout(() => { copyMessage.style.visibility = 'hidden'; }, 2000); // Hide after 2 seconds
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        };
    }, []);

    const artifactDataMap = useMemo(() => {
        const artifactData = messages.flatMap(msg => msg.artifacts || []);
        return artifactData.reduce((map, artifact) => { map[artifact.id] = artifact; return map; }, {});
    }, [messages]);

    // Add the handleInputChange function
    const handleInputChange = (e) => {
        const text = e.target.innerText;
        setInputMessage(text);
        adjustTextareaHeight(e.target);
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            // Only scroll to bottom if we're near the bottom or this is the first message
            if (isNearBottom() || prevMessages.current.length === 0) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
            prevMessages.current = messages;
        }
    }, [messages, isNearBottom]);

    const handleSendMessage = async () => {
        const content = textareaRef.current.innerText.trim();
        if (content === '') return;

        textareaRef.current.innerText = '';
        setInputMessage('');
        setHistoryIndex(-1); // Reset history index
        sendMessageToServer(content, autographMode);

        // Scroll to bottom after sending the message
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 0);
    };

    // -------------- Auto grow text field
    const adjustTextareaHeight = (element) => {
        if (!element) return;
        element.style.height = 'auto';
        const newHeight = Math.min(element.scrollHeight, parseInt(getComputedStyle(element).maxHeight));
        element.style.height = `${newHeight}px`;
        element.style.overflowY = element.scrollHeight > newHeight ? 'auto' : 'hidden';
    };

    useEffect(() => {
        if (textareaRef.current) {
            adjustTextareaHeight(textareaRef.current);
        }
    }, [inputMessage]);

    // to autofocus the chat input field
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    // ------------ CHAT RECOMMENDATIONS
    const fetchRecommendations = async () => {
        setIsLoadingRecommendations(true);
        try {
            // Use different endpoint based on whether there's a thread
            const data = await client.fetchRecommendations(
                threadId,
                selectedDataSourcesIDs
            );
            setRecommendations(data.suggestions);
            // Add a small delay to ensure the DOM has updated
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        } finally {
            setIsLoadingRecommendations(false);
        }
    };

    // Update useEffect to clear recommendations when streaming starts
    useEffect(() => {
        if (selectedDataSourcesIDs === null || selectedDataSourcesIDs.length === 0) {
            setRecommendations([]);
            return;
        }
        if (isStreaming) {
            setRecommendations([]); // Clear recommendations when streaming starts
        } else {

            fetchRecommendations();
        }
    }, [isStreaming, selectedDataSourcesIDs]);


    // ------------ KEYBOARD SHORTCUTS  for: popups
    // Add this helper function
    const placeCursorAtEnd = (el) => {
        el.focus();
        if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            // Handle global shortcuts first
            // Close popups with Esc key
            if (event.key === 'Escape') {
                setIsDataSourceMenuOpen(false);
                textareaRef.current.focus();
                return; // Stop further processing
            }

            // If no submenus are open, handle arrow keys in the chat input field
            // Check if the chat input field is focused
            const isChatInputFocused = document.activeElement === textareaRef.current;

            if (isChatInputFocused) {
                if (event.altKey && event.key === 'ArrowUp') {
                    event.preventDefault();
                    // Move back in history
                    if (historyIndex + 1 < userMessages.length) {
                        const newIndex = historyIndex + 1;
                        setHistoryIndex(newIndex);
                        const message = userMessages[newIndex].content;
                        textareaRef.current.innerText = message;
                        setInputMessage(message);
                        placeCursorAtEnd(textareaRef.current);
                    }
                } else if (event.altKey && event.key === 'ArrowDown') {
                    event.preventDefault();
                    // Move forward in history
                    if (historyIndex - 1 >= 0) {
                        const newIndex = historyIndex - 1;
                        setHistoryIndex(newIndex);
                        const message = userMessages[newIndex].content;
                        textareaRef.current.innerText = message;
                        setInputMessage(message);
                        placeCursorAtEnd(textareaRef.current);
                    } else if (historyIndex - 1 === -1) {
                        // Clear the input field
                        setHistoryIndex(-1);
                        textareaRef.current.innerText = '';
                        setInputMessage('');
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        isDataSourceMenuOpen,
        historyIndex,
        userMessages,
        textareaRef,
        placeCursorAtEnd
    ]);

    // Effect to handle data source menu visibility. A click outside the menu closes it.
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside the menu and its toggle button
            if (dataSourceMenuRef.current &&
                !dataSourceMenuRef.current.contains(event.target) &&
                !event.target.closest('.chat-ds-select-container')) {
                setIsDataSourceMenuOpen(false);
            }

            // Check if click is outside the model menu and its toggle button
            if (modelMenuRef.current &&
                !modelMenuRef.current.contains(event.target) &&
                !event.target.closest('.model-switcher-container')) {
                setIsModelMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Add a function to toggle the expanded/collapsed state of a tool message group
    const toggleToolMessages = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // When final messages stream in, collapse the tool messages
    useEffect(() => {
        if (!isStreaming && currentToolCall === null) {
            // When streaming stops and there are no active tool calls,
            // collapse all tool message groups
            const newExpandedState = {};
            groupedMessages.forEach(group => {
                if (group.tool_messages.length > 0 && group.final_message) {
                    newExpandedState[group.id] = false;
                }
            });
            setExpandedGroups(prev => ({
                ...prev,
                ...newExpandedState
            }));
        }
    }, [isStreaming, currentToolCall, groupedMessages]);

    // When new tool calls appear, make sure they're expanded
    useEffect(() => {
        if (isStreaming && currentToolCall !== null) {
            // Ensure active tool message groups are expanded during streaming
            const lastGroup = groupedMessages[groupedMessages.length - 1];
            if (lastGroup && lastGroup.tool_messages.length > 0 && !lastGroup.final_message) {
                setExpandedGroups(prev => ({
                    ...prev,
                    [lastGroup.id]: true // Force expand during active tool calls
                }));
            }
        }
    }, [isStreaming, currentToolCall, groupedMessages]);

    return (
        <div className="chat-and-artifact-container">
            <div className="artifact-pane" id="artifact-pane">
                <ArtifactPane artifacts={artifacts} />
            </div>
            <div className="react-chat-container" id="chat-root">
                {/* if there are no messages, don't show the chat container */}
                {messages.length > 0 && (
                    <div className={`chat-container ${messages.length === 0 ? 'empty-chat' : ''}`} ref={chatContainerRef}>
                        {groupedMessages.map((group) => (
                            <div key={group.id} className="chat-message">
                                {group.tool_messages.length > 0 && (
                                    <div className="tool-messages-container">
                                        <div
                                            className="tool-messages-header"
                                            onClick={() => toggleToolMessages(group.id)}
                                        >
                                            <div className="tool-messages-toggle">
                                                <span>Analysis</span>
                                                <ChevronUpIcon
                                                    className={`heroicon ${expandedGroups[group.id] === false ? 'chevron-left' : 'chevron-down'}`}
                                                    aria-label="Toggle"
                                                />
                                            </div>
                                        </div>
                                        <div className={`tool-messages ${expandedGroups[group.id] === false ? 'collapsed' : ''}`}>
                                            {group.tool_messages.map((message, index, filteredMessages) => (
                                                <ChatMessage
                                                    key={message.id}
                                                    message={message}
                                                    prevMessage={filteredMessages[index - 1]}
                                                    isLatestMessage={index === filteredMessages.length - 1}
                                                    scrollToBottom={scrollToBottom}
                                                    threadId={threadId}
                                                    isStreaming={isStreaming}
                                                    isFinalMessage={false}
                                                    connectedApps={connectedApps}
                                                    artifactDataMap={artifactDataMap}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="final-message">
                                    {group.final_message && (
                                        <ChatMessage
                                            key={group.final_message.id}
                                            message={group.final_message}
                                            prevMessage={null}
                                            isLatestMessage={false}
                                            scrollToBottom={scrollToBottom}
                                            threadId={threadId}
                                            isStreaming={isStreaming}
                                            isFinalMessage={true}
                                            connectedApps={connectedApps}
                                            artifactDataMap={artifactDataMap}
                                        />
                                    )}
                                </div>
                                {group.role === 'assistant' && (
                                    <ChatMessageBottomBar
                                        role={group.role}
                                        message={group.final_message}
                                        prevMessage={(() => {
                                            // Find the previous group
                                            const currentGroupIndex = groupedMessages.findIndex(g => g.id === group.id);
                                            if (currentGroupIndex > 0) {
                                                // Get the last message from the previous group
                                                const prevGroup = groupedMessages[currentGroupIndex - 1];
                                                return prevGroup.final_message;
                                            }
                                            return null;
                                        })()}
                                        threadId={threadId}
                                        isStreaming={isStreaming}
                                        isLatestMessage={groupedMessages[groupedMessages.length - 1].id === group.id}
                                        scrollToBottom={scrollToBottom}
                                        client={client}
                                    />
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-message">
                                <div className="camel-message-text loading">
                                    <div className="loading-spinner"></div>
                                    <p>Thinking</p>
                                </div>
                            </div>
                        )}
                        {currentToolCall && (
                            <div className="chat-message">
                                <div className="camel-message-text loading">
                                    <div className="loading-spinner"></div>
                                    <p>{currentToolCall}</p>
                                </div>
                            </div>
                        )}
                        {retryMessage && (
                            <div className="camel-message-text centered">
                                <p>
                                    <span className="chat-error-message">Error: </span>
                                    {retryMessage.errorMessage || 'Unknown error. Please try again.'}
                                </p>
                                <button className="retry-button" onClick={() => sendMessageToServer(retryMessage.message, autographMode)}>Retry</button>
                            </div>
                        )}
                        {/* // Recommendations display */}
                        {recommendations.length > 0 && !isStreaming && !retryMessage && (
                            <div className="chat-recommendations">
                                <div className="chat-recommendations-list">
                                    {recommendations.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            className="chat-recommendation-button"
                                            onClick={() => {
                                                if (textareaRef.current) {
                                                    textareaRef.current.innerText = suggestion;
                                                    setInputMessage(suggestion);
                                                    textareaRef.current.focus();
                                                }
                                            }}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="chat-container-bottom-padding"></div>
                    </div>
                )}

                <div className={`chat-anchor-section ${messages.length === 0 ? 'empty-chat' : ''}`}>
                    {messages.length === 0 &&
                        <h1 className="empty-chat-header">{userData.has_completed_onboarding ? "Let's get started" : "Your data is connected. Start by asking any question."}</h1>
                    }
                    <div className="chat-text-input">
                        <div className={`chat-text-input-field ${messages.length === 0 ? 'empty-chat' : ''}`}>

                            <div
                                id="chat-input-field"
                                className="chat-input-editable"
                                contentEditable={true}
                                ref={textareaRef}
                                onInput={(e) => handleInputChange(e)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (!isStreaming) {
                                            handleSendMessage();
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.shiftKey) {
                                        e.preventDefault();
                                        document.execCommand('insertLineBreak');
                                    }
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    document.execCommand('insertText', false, text);
                                }}
                                role="textbox"
                                aria-multiline="true"
                                spellCheck="true"
                                data-placeholder="What would you like to know?"
                            ></div>
                            <div className="chat-input-bottom-row">
                                <div className="chat-input-bottom-row-left">
                                </div>
                                <div className="chat-input-bottom-row-right">
                                    <div className="ci-right-side-center-content">
                                        {Object.keys(availableModels).length > 1 && (
                                            <div className="model-switcher-container">
                                                <div
                                                    className="active-model"
                                                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                                >
                                                    <span>{availableModels[model].name}</span>
                                                    <ChevronUpIcon className="heroicon " aria-label="Model switcher" />
                                                </div>
                                                {isModelMenuOpen && (
                                                    <div className="model-switcher-menu" ref={modelMenuRef}>
                                                        {Object.entries(availableModels).map(([modelKey, modelInfo]) => (
                                                            <button
                                                                key={modelKey}
                                                                className={`model-switcher-menu-item ${model === modelKey ? 'selected' : ''}`}
                                                                onClick={() => {
                                                                    if (model === modelKey) {
                                                                        // Same model, just close the menu
                                                                        setIsModelMenuOpen(false);
                                                                    } else if (isThreadLocked) {
                                                                        // Different model in locked thread, start a new chat
                                                                        // Save the selected model to localStorage before redirecting
                                                                        localStorage.setItem('lastSelectedModel', modelKey);
                                                                        // Navigate to new chat using browser navigation
                                                                        const newChatUrlWithModel = `${newChatUrl}?model=${modelKey}`;
                                                                        window.location.href = newChatUrlWithModel;
                                                                    } else {
                                                                        // Different model in new chat, switch the model
                                                                        setModel(modelKey);
                                                                        setIsModelMenuOpen(false);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="model-switcher-selected-model-container">
                                                                    <span className="model-name">{modelInfo.name}</span>
                                                                    {model === modelKey ? (
                                                                        <CheckIcon className="heroicon " aria-label="Selected" />
                                                                    ) : isThreadLocked && (
                                                                        <span className="new-chat-label">New chat</span>
                                                                    )}
                                                                </div>
                                                                <span className="model-description">{modelInfo.description}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            className="icon-button"
                                            onClick={() => setAutographMode(!autographMode)}
                                            data-tooltip={autographMode ? "Create graphs" : "Do not create graphs"}
                                        >
                                            {autographMode ? (
                                                <ChartBarIconSolid className="heroicon" aria-label="Autograph mode" />
                                            ) : (
                                                <ChartBarIcon className="heroicon color-mode-40" aria-label="Autograph mode" />
                                            )}
                                        </button>
                                        <button
                                            className="icon-button"
                                            onClick={isStreaming ? handleStopStreaming : handleSendMessage}
                                            aria-label={isStreaming ? 'Stop' : 'Send'}
                                        >
                                            {isStreaming ?
                                                <StopCircleIconSolid className="heroicon heroicon-xl" aria-label="Stop" /> :
                                                <ArrowUpCircleIconSolid className="heroicon heroicon-xl" aria-label="Send" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {messages.length === 0 && (
                        <div className="chat-recommendations empty-chat">
                            <h3 className="empty-chat-recommendations-header">Recommendations</h3>
                            <div className="chat-recommendations-list empty-chat">
                                {isLoadingRecommendations ? (
                                    // Show 3 placeholder buttons while loading
                                    Array(3).fill(0).map((_, index) => (
                                        <button
                                            key={index}
                                            className="chat-recommendation-button loading"
                                            disabled
                                        >
                                            <div className="loading-lines"></div>
                                        </button>
                                    ))
                                ) : recommendations.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        className="chat-recommendation-button"
                                        onClick={() => {
                                            if (textareaRef.current) {
                                                textareaRef.current.innerText = suggestion;
                                                setInputMessage(suggestion);
                                                textareaRef.current.focus();
                                            }
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default App;