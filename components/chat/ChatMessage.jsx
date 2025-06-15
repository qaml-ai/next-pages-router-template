import React from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import TextMessagePart from './TextMessagePart';
import ToolCalls from './ToolCalls';

const ChatMessage = ({ message, prevMessage, isLatestMessage, scrollToBottom, threadId, isStreaming, isFinalMessage, connectedApps, artifactDataMap }) => {
    let { content, role, artifacts } = message;
    if (role === 'hidden' || role === 'developer') return null;
    let tool_calls = [];
    if (typeof content !== 'string') {
        // Convert content to array if it's an object with content property
        const contentArray = Array.isArray(content) ? content : ([content.content] || []);
        tool_calls = contentArray.filter(part => part.type === 'tool_use');
        content = contentArray.filter(part => part.type === 'text').map(part => part.text)[0] || '';
    }
    artifacts = artifacts || [];

    if (role === "user") {
        return (
            <div className="user-message-container">
                {/* User messages only have text content */}
                {content && <TextMessagePart key={message.id} content={content} role={role} />}
            </div>
        );
    } else if (isFinalMessage) {
        return (
            <>
                {/* Renders the text of the message. Role is user or assistant and impacts styling */}
                {content && <TextMessagePart key={message.id} content={content} role={role} artifactDataMap={artifactDataMap} />}
            </>
        );
    } else {
        return (
            <div className="tool-call-container">
                {/* Renders the analysis text of the message. */}
                {/* NOTE: For backwards compatibility we don't show text message parts if there are tool calls present */}
                {/* FIXME: @miguel, can we just remove the content line below or is it still needed for backwards compatibility with pre 3.0 chats? */}
                {content && !tool_calls.length && <TextMessagePart key={message.id} content={content} role={role} />}

                {/* Renders the tool calls of the message. */}
                <ToolCalls tool_calls={tool_calls} scrollToBottom={scrollToBottom} connectedApps={connectedApps} />
                {/* Renders the mini artifacts done in the analysis. */}
                {artifacts.length > 0 && (
                    <>
                        {artifacts.map(artifact => (
                            <button
                                className="artifact-button"
                                key={artifact.id}
                                onClick={() => {
                                    const event = new CustomEvent('showArtifact', { detail: { artifactId: artifact.id } });
                                    window.dispatchEvent(event);
                                }}
                            >
                                <ArrowTopRightOnSquareIcon className="heroicon color-mode-100" aria-label="Go to artifact" />
                                <span>{artifact.title}</span>
                            </button>
                        ))}
                    </>
                )}
            </div>
        );
    }
};

export default ChatMessage;