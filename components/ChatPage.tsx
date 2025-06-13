'use client'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'

export interface ChatPageProps {
  initialMessages: any[]
  availableModels: Record<string, any>
  connectedApps: any[]
  threadData: any
  modelOverride: string | null
  artifactData?: any[]
}

// Component will be defined later in the file

import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import markdownit from 'markdown-it';
import mk from '@vscode/markdown-it-katex';
import hljs from 'highlight.js';

// Copy code functionality will be handled via React state and refs

const md = new markdownit({
    highlight: function (str, lang) {
        return hljs.highlightAuto(str).value;
    }
});

// Override default code block rendering
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const langName = token.info.trim().split(/\s+/g)[0];
    const highlighted = hljs.highlightAuto(token.content).value;

    return `
    <div class="code-block">
        <div class="code-block-top-bar">
            <span class="code-block-language">${langName || 'plaintext'}</span>
			<div class="code-block-buttons">
				<span class="copy-message" style="visibility: hidden;">Copied</span>
				<button class="icon-button code-block-button" onclick="window.handleCopyCode(this.closest('.code-block'))" data-tooltip="Copy code block">
					<img src="/static/images/copy-icon.png" alt="Copy"/>
				</button>
			</div>
        </div>
        <code>${highlighted}</code>
    </div>`;
};

md.use(mk, { throwOnError: false, output: 'mathml' });

function renderMarkdown(content: string, artifactDataMap: Record<string, any> = {}) {
	if (!content) return null;
    let renderedHtml = md.render(
        content
            .replace(/\\\[/g, '$$$')
            .replace(/\\\]/g, '$$$')
            .replace(/\\\(/g, '$$')
            .replace(/\\\)/g, '$$')
    );
	if (!renderedHtml) return null;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderedHtml;

    // Wrap tables with div.table-container
    wrapper.querySelectorAll('table').forEach(table => {
        const container = document.createElement('div');
        container.className = 'table-container';
        table.parentNode.insertBefore(container, table);
        container.appendChild(table);
    });

    // Process artifact links: insert buttons and remove original anchors
    Array.from(wrapper.querySelectorAll('a[href]')).forEach(a => {
        const href = a.getAttribute('href');
        const match = href.match(/\d+/);
        if (!match) return;
        const artifactId = Number(match[0]);
        const artifact = artifactDataMap[artifactId] || {};
        const title = (artifact.title || '').trim();
        const is_chart = Boolean(artifact.is_chart);
        const description = artifact.description || '';

        // HTML for the artifact button
        const btnHtml = `
            <button class="artifact-button-final-message" onclick="window.dispatchEvent(new CustomEvent('showArtifact', { detail: { artifactId: ${artifactId} } }))">
                <div class="artifact-button-final-message-content">
                    <span class="artifact-button-final-message-title">${title}</span>
                    <span class="artifact-button-final-message-description">${description}</span>
                </div>
                <img class="color-flip-60" src="/static/images/${is_chart ? 'report-thin-icon' : 'table-thin-icon'}.png" alt="Go to artifact"/>
            </button>
        `;

        // Insert button after the block-level container
        const block = a.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, table, div') || a;
        if (block.parentNode) block.insertAdjacentHTML('afterend', btnHtml);

        // Remove the original anchor and any trailing <br>
        const next = a.nextSibling;
        a.remove();
        if (next && next.nodeType === Node.ELEMENT_NODE && next.tagName.toLowerCase() === 'br') next.remove();

        // Auto-open behaviour
        if (!window.autoOpenedArtifacts.includes(artifactId)) {
            window.autoOpenedArtifacts.push(artifactId);
            setTimeout(() => window.dispatchEvent(new CustomEvent('showArtifact', { detail: { artifactId } })), 0);
        }
    });

    // Clean up empty paragraphs left behind
    wrapper.querySelectorAll('p').forEach(p => { if (p.textContent.trim() === '' && p.parentNode) p.remove(); });

    renderedHtml = wrapper.innerHTML;

    return {
        __html: renderedHtml
    };
}

const ToolCalls = React.memo(({ tool_calls, scrollToBottom, connectedAppsState, artifactDataMap, handleCopyCode }) => {
    if (tool_calls.length === 0) return null;

    const renderToolCall = useCallback((tool_call) => {
        let input = tool_call.input || {};
        input.description = input.description || '';
        
        // Handle query differently based on tool call type
        if (tool_call.name === 'search') {
            // For search, ensure query is an array
            if (Array.isArray(input.query)) {
                input.query = input.query;
            } else if (typeof input.query === 'string' && input.query.length > 0) {
                input.query = [input.query];
            } else {
                input.query = [];
            }
        } else {
            // For other tool calls, keep query as-is (likely string for SQL highlighting)
            input.query = input.query || '';
        }
        
        input.title = input.title || '';
        input.thought = input.thought || '';
		input.code = input.code || '';
		input.chart_code = input.chart_code || '';
        
        let selectedConnection = connectedAppsState.find(app => app.id === input.connection_id);
        if (!selectedConnection) selectedConnection = {
            name: 'camel',
            account_name: 'camel',
            logo: 'camel'
        };
        
        return (
            <React.Fragment key={tool_call.id}>
                {(() => {
                    switch (tool_call.name) {
                        case 'run_query':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/table-icon.png`} 
                                                alt="Table" 
                                                className="tool-call-logo color-flip-80"
                                            />
                                        </div>
                                        Querying {selectedConnection.account_name}
                                    </div>
                                    <div className="tool-call-body-content">
										<div className="tool-call-ec-section">
                                            <p>{input.description}</p>
                                        </div>

                                        <div className="tool-call-ec-section">
                                            <div className="tool-call-ec-ds-tag">
                                                <img 
                                                    src={`/static/images/${selectedConnection.name.toLowerCase()}-logo.png`} 
                                                    alt={selectedConnection.name} 
                                                    className="tool-call-logo"
                                                />
                                                {selectedConnection.account_name}
                                            </div>
                                        </div>
                                        
                                        <div className="tool-call-ec-section">
                                            <div className="code-block no-margin smaller-font">
                                                <div className="code-block-top-bar">
                                                    <span className="code-block-language">SQL</span>
                                                    <div className="code-block-buttons">
                                                        <span className="copy-message" style={{ visibility: 'hidden' }}>Copied</span>
                                                        <button 
                                                            className="icon-button code-block-button" 
                                                            onClick={(e) => handleCopyCode(e.currentTarget.closest('.code-block'))} 
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <img src="/static/images/copy-icon.png" alt="Copy"/>
                                                        </button>
                                                    </div>
                                                </div>
                                                <code className="tool-call-code" dangerouslySetInnerHTML={{ __html: hljs.highlight('sql', input.query).value }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );

                        case 'run_python_code':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/code-icon.png`} 
                                                alt="Code" 
                                                className="tool-call-logo color-flip-80"
                                            />
                                        </div>
                                        Running Python code
                                    </div>
                                    <div className="tool-call-body-content">
                                        <div className="tool-call-ec-section">
                                            <p>{input.description}</p>
                                        </div>
                                        <div className="tool-call-ec-section">
                                            <div className="code-block no-margin smaller-font">
                                                <div className="code-block-top-bar">
                                                    <span className="code-block-language">Python</span>
                                                    <div className="code-block-buttons">
                                                        <span className="copy-message" style={{ visibility: 'hidden' }}>Copied</span>
                                                        <button 
                                                            className="icon-button code-block-button" 
                                                            onClick={(e) => handleCopyCode(e.currentTarget.closest('.code-block'))} 
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <img src="/static/images/copy-icon.png" alt="Copy"/>
                                                        </button>
                                                    </div>
                                                </div>
                                                <code className="tool-call-code" dangerouslySetInnerHTML={{ __html: hljs.highlight('python', input.code).value }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        
                        case 'display_chart':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/chart-icon.png`} 
                                                alt="Chart" 
                                                className="tool-call-logo color-flip-80"
                                            />
                                        </div>
                                        Visualizing {input.title}
                                    </div>
                                    <div className="tool-call-body-content">
										<div className="tool-call-ec-section">
                                            <p>{input.description}</p>
                                        </div>

                                        <div className="tool-call-ec-section">
                                            <div className="tool-call-ec-ds-tag">
                                                <img 
                                                    src={`/static/images/${selectedConnection.name.toLowerCase()}-logo.png`} 
                                                    alt={selectedConnection.name} 
                                                    className="tool-call-logo rounded"
                                                />
                                                {selectedConnection.account_name}
                                            </div>
                                        </div>
                                        
										<div className="tool-call-ec-section">
                                            <div className="code-block no-margin smaller-font">
                                                <div className="code-block-top-bar">
                                                    <span className="code-block-language">Python</span>
                                                    <div className="code-block-buttons">
                                                        <span className="copy-message" style={{ visibility: 'hidden' }}>Copied</span>
                                                        <button 
                                                            className="icon-button code-block-button" 
                                                            onClick={(e) => handleCopyCode(e.currentTarget.closest('.code-block'))} 
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <img src="/static/images/copy-icon.png" alt="Copy"/>
                                                        </button>
                                                    </div>
                                                </div>
                                                <code className="tool-call-code" dangerouslySetInnerHTML={{ __html: hljs.highlight('python', input.chart_code).value }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        
                        case 'think':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/light-bulb-icon.png`} 
                                                alt="Thinking" 
                                                className="tool-call-logo color-flip-80"
                                            />
                                        </div>
                                        Planning
                                    </div>
                                    <div className="tool-call-body-content">
                                        <div className="tool-call-planning"
                                             dangerouslySetInnerHTML={renderMarkdown(input.thought, artifactDataMap)} />
                                    </div>
                                </>
                            );
                        
                        case 'search':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/search-icon.png`} 
                                                alt="Search" 
                                                className="tool-call-logo color-flip-80"
                                            />
                                        </div>
                                        Searching camelAI's memory
                                    </div>
                                    <div className="tool-call-body-content">
                                        <div className="tool-call-search">
                                            {input.query.map((q, i) => (
                                                <span key={i}>{q}</span>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            );
                        
                        case 'run_federated_query':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/table-icon.png`} 
                                                alt="Table" 
                                                className="tool-call-logo color-flip-80"
                                            />
                                        </div>
                                        Querying {input.queries.length} data sources
                                    </div>
                                    <div className="tool-call-body-content">
										<div className="tool-call-ec-section">
                                            <p>{input.description || "Federated query across multiple data sources"}</p>
                                        </div>
										
                                        <div className="tool-call-ec-section">
                                            <div className="tool-call-data-sources">
                                                {input.queries.map((query, index) => {
                                                    // Find the connection details from connectedAppsState
                                                    const connectionDetails = connectedAppsState.find(app => app.id === query.connection_id) || {};
                                                    const connectionName = connectionDetails.name || 'unknown';
                                                    const accountName = connectionDetails.account_name || query.name;
                                                    
                                                    return (
                                                        <div key={index} className="tool-call-ec-ds-tag">
                                                            <img 
                                                                src={`/static/images/${connectionName.toLowerCase()}-logo.png`} 
                                                                alt={connectionName} 
                                                                className="tool-call-logo rounded"
                                                            />
                                                            {accountName}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="tool-call-ec-section">
                                            <div className="code-block no-margin smaller-font">
                                                <div className="code-block-top-bar">
                                                    <span className="code-block-language">SQL</span>
                                                    <div className="code-block-buttons">
                                                        <span className="copy-message" style={{ visibility: 'hidden' }}>Copied</span>
                                                        <button 
                                                            className="icon-button code-block-button" 
                                                            onClick={(e) => handleCopyCode(e.currentTarget.closest('.code-block'))} 
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <img src="/static/images/copy-icon.png" alt="Copy"/>
                                                        </button>
                                                    </div>
                                                </div>
                                                <code className="tool-call-code" dangerouslySetInnerHTML={{ 
                                                    __html: hljs.highlight('sql', 
                                                        // Build combined query string with comments
                                                        input.queries.map((query, idx) => {
                                                            // Add trailing " as query_name" to individual queries if needed
                                                            const queryText = query.query.trim();
                                                            // Only add "as query_name" if it's not already in the query
                                                            const queryWithAlias = queryText.toLowerCase().includes(` as ${query.name.toLowerCase()}`) ?
                                                                queryText : `${queryText} as ${query.name}`;
                                                            
                                                            return `-- Query ${idx + 1}: ${query.name}\n${queryWithAlias}`;
                                                        }).join('\n\n') + 
                                                        (input.join_query ? `\n\n-- Join Query\n${input.join_query}` : '')
                                                    ).value
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        
                        case 'display_federated_chart':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/chart-icon.png`} 
                                                alt="Chart" 
                                                className="tool-call-logo color-flip-80"
                                            />
                                        </div>
                                        Visualizing {input.title}
                                    </div>
                                    <div className="tool-call-body-content">
                                        <div className="tool-call-ec-section">
                                            <p>{input.description}</p>
                                        </div>
                                        
                                        <div className="tool-call-ec-section">
                                            <div className="tool-call-data-sources">
                                                {input.queries && input.queries.map((query, index) => {
                                                    // Find the connection details from connectedAppsState
                                                    const connectionDetails = connectedAppsState.find(app => app.id === query.connection_id) || {};
                                                    const connectionName = connectionDetails.name || 'unknown';
                                                    const accountName = connectionDetails.account_name || query.name;
                                                    
                                                    return (
                                                        <div key={index} className="tool-call-ec-ds-tag">
                                                            <img 
                                                                src={`/static/images/${connectionName.toLowerCase()}-logo.png`} 
                                                                alt={connectionName} 
                                                                className="tool-call-logo rounded"
                                                            />
                                                            {accountName}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        
                                        {input.chart_code && (
                                            <div className="tool-call-ec-section">
                                                <div className="code-block no-margin smaller-font">
                                                    <div className="code-block-top-bar">
                                                        <span className="code-block-language">Python</span>
                                                        <div className="code-block-buttons">
                                                            <span className="copy-message" style={{ visibility: 'hidden' }}>Copied</span>
                                                            <button 
                                                                className="icon-button code-block-button" 
                                                                onClick={(e) => handleCopyCode(e.currentTarget.closest('.code-block'))} 
                                                                data-tooltip="Copy code block"
                                                            >
                                                                <img src="/static/images/copy-icon.png" alt="Copy"/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <code className="tool-call-code" dangerouslySetInnerHTML={{ __html: hljs.highlight('python', input.chart_code).value }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        
                        default:
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <img 
                                                src={`/static/images/${selectedConnection.name.toLowerCase()}-logo.png`} 
                                                alt={selectedConnection.name} 
                                                className="tool-call-logo rounded"
                                            />
                                        </div>
                                        {tool_call.name}
                                    </div>
                                    <div className="tool-call-body-content">
                                        <div className="tool-call-ec-section">
                                            <pre>{JSON.stringify(input, null, 2)}</pre>
                                        </div>
                                    </div>
                                </>
                            );
                    }
                })()}
            </React.Fragment>
        );
    }, []);

    return (
        <>
            {tool_calls.map(renderToolCall)}
        </>
    );
});

const TextMessagePart = React.memo(({ content, role, artifactDataMap }) => {
    if (role === "user") {
		return (
			<div className="user-message-text">
				<p>{content}</p>
			</div>
		);
	} else {
		return (
			<div
				className="camel-message-text"
				dangerouslySetInnerHTML={renderMarkdown(content, artifactDataMap)}
			/>
		);
	}
});

const ChatMessage = ({ message, prevMessage, isLatestMessage, scrollToBottom, threadId, isStreaming, isFinalMessage, connectedAppsState, artifactDataMap, handleCopyCode }) => {
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
                {content && <TextMessagePart key={message.id} content={content} role={role} artifactDataMap={artifactDataMap} />}
            </div>
        );
    } else if (isFinalMessage) {
        return (
            <>
                {/* Renders the text of the message. Role is user or assistant and impacts styling */}
                {content && <TextMessagePart key={message.id} content={content} role={role} artifactDataMap={artifactDataMap} />}

                {/* Renders the artifacts of the message. TODO: Update the styling of the artifacts in the final message */}
                {/* {artifacts.length > 0 && (
                    <div className="chat-message-artifacts">
                        {artifacts.map(artifact => (
                            <button 
                                className="artifact-button"
                                key={artifact.id} 
                                onClick={() => {
                                    const event = new CustomEvent('showArtifact', { detail: { artifactId: artifact.id } });
                                    window.dispatchEvent(event);
                                }}
                            >
                                <img className="color-flip-100" src={`/static/images/artifact-icon.png`} alt="Go" />
                                <span>{artifact.title}</span>
                            </button>
                        ))}
                    </div>
                )} */}
            </>
        );
    } else {
        return (
            <div className="tool-call-container">
                {/* Renders the text of the message. Role is user or assistant and impacts styling */}
                {/* NOTE: For backwards compatibility we don't show text message parts if there are tool calls present */}
                {content && !tool_calls.length && <TextMessagePart key={message.id} content={content} role={role} artifactDataMap={artifactDataMap} />}
                {/* Renders the tool calls of the message. */}
                <ToolCalls tool_calls={tool_calls} scrollToBottom={scrollToBottom} connectedAppsState={connectedAppsState} artifactDataMap={artifactDataMap} handleCopyCode={handleCopyCode} />
                {/* Renders the artifacts of the message. */}
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
                                <img className="color-flip-100" src={`/static/images/artifact-icon.png`} alt="Go" />
                                <span>{artifact.title}</span>
                            </button>
                        ))}
                    </>
                )}
            </div>
        );
    }
};

// New component for the bottom bar
const ChatMessageBottomBar = ({ 
    role, 
    message,
    prevMessage,
    threadId,
    isStreaming,
    isLatestMessage,
    scrollToBottom
}) => {
    const [isCopied, setIsCopied] = useState(false);
    const [feedbackState, setFeedbackState] = useState({
        activeSubmenu: null, // Can be 'thumbsDown' or 'thumbsUp'
        thumbsDownSubmitted: false,
        thumbsUpSubmitted: false,
        showOtherInput: false,
        otherDetails: ''
    });

    const handleCopy = () => {
		// Function to strip basic Markdown syntax
		const stripMarkdown = (text) => {
			return text
				.replace(/^#+\s/gm, '') // Remove heading markers
				.replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
				.replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
				.replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
				.replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
				.replace(/`([^`]+)`/g, '$1') // Remove inline code
				// .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
				.replace(/!\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove images, keep alt text
				.replace(/^>+\s/gm, '') // Remove blockquotes
				.replace(/^[-*+]\s/gm, '') // Remove unordered list markers
				.replace(/^\d+\.\s/gm, '') // Remove ordered list markers
				.replace(/^(\s*[-*+]|\s*\d+\.)\s/gm, '') // Remove list markers with indentation
				.replace(/\n{2,}/g, '\n\n') // Reduce multiple newlines to max two
				.trim(); // Trim leading/trailing whitespace
		};
	
        // Extract message content
        const content = typeof message.content === 'string' 
            ? message.content 
            : Array.isArray(message.content)
                ? message.content.filter(part => part.type === 'text').map(part => part.text)[0] || ''
                : '';
                
		const strippedContent = stripMarkdown(content);

		navigator.clipboard.writeText(strippedContent)
			.then(() => {
				setIsCopied(true);
				setTimeout(() => setIsCopied(false), 3000);
			})
			.catch(err => console.error('Failed to copy: ', err));
	};

    const handleThumbsDown = () => {
        if (!feedbackState.thumbsDownSubmitted) {
            setFeedbackState(prev => ({ 
                ...prev, 
                activeSubmenu: prev.activeSubmenu === 'thumbsDown' ? null : 'thumbsDown'
            }));
            console.log("thumbs down pressed, new state:", { ...feedbackState, activeSubmenu: 'thumbsDown' });
            if (isLatestMessage) {
                scrollToBottom();
            }
        }
    };

    const handleThumbsUp = async () => {
        if (!feedbackState.thumbsUpSubmitted) {
            await submitThumbsUp(threadId);
            setFeedbackState(prev => ({
                ...prev,
                thumbsUpSubmitted: true,
                activeSubmenu: null
            }));
        }
    };

    const submitThumbsUp = async (threadId) => {
        try {
            // Safely get user message content even if prevMessage is null
            const userMessageContent = prevMessage ? (
                typeof prevMessage.content === 'string'
                    ? prevMessage.content
                    : Array.isArray(prevMessage.content)
                        ? prevMessage.content.filter(part => part.type === 'text').map(part => part.text).join('')
                        : prevMessage.content && prevMessage.content.content
                            ? prevMessage.content.content
                            : ''
            ) : '';
            
            // Safely get bot message content
            const botMessageContent = typeof message.content === 'string'
                ? message.content
                : Array.isArray(message.content)
                    ? message.content.filter(part => part.type === 'text').map(part => part.text).join('')
                    : message.content && message.content.content
                        ? message.content.content
                        : '';
                    
            const response = await fetch('/api/submit_thumbs_up/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_message: userMessageContent,
                    chat_bot_message: botMessageContent,
                    message_id: message.id,
                    thread_id: threadId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('Thumbs up submitted successfully');
        } catch (error) {
            console.error('Error submitting thumbs up:', error);
        }
    };

    const handleDetailsSubmit = async (reason, details) => {
        await submitDetails(reason, details, threadId);
        setFeedbackState(prev => ({
            ...prev,
            activeSubmenu: null,
            thumbsDownSubmitted: true,
            showOtherInput: false,
            otherDetails: ''
        }));
    };

    const handleOtherClick = () => {
        setFeedbackState(prev => ({ ...prev, showOtherInput: true }));
        scrollToBottom();
        setTimeout(() => {
            document.getElementById('other-feedback-input-field')?.focus();
        }, 0);
    };

    const handleOtherSubmit = () => {
        if (feedbackState.otherDetails.trim()) {
            handleDetailsSubmit('Other', feedbackState.otherDetails);
        }
    };

    const submitDetails = async (reason, details, threadId) => {
        try {
            // Safely get user message content even if prevMessage is null
            const userMessageContent = prevMessage ? (
                typeof prevMessage.content === 'string'
                    ? prevMessage.content
                    : Array.isArray(prevMessage.content)
                        ? prevMessage.content.filter(part => part.type === 'text').map(part => part.text).join('')
                        : prevMessage.content && prevMessage.content.content
                            ? prevMessage.content.content
                            : ''
            ) : '';
            
            // Safely get bot message content
            const botMessageContent = typeof message.content === 'string'
                ? message.content
                : Array.isArray(message.content)
                    ? message.content.filter(part => part.type === 'text').map(part => part.text).join('')
                    : message.content && message.content.content
                        ? message.content.content
                        : '';
                    
            const response = await fetch('/api/submit_thumbs_down/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason,
                    details: details,
                    user_message: userMessageContent,
                    chat_bot_message: botMessageContent,
                    message_id: message.id,
                    thread_id: threadId
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Details submitted successfully:', data);
        } catch (error) {
            console.error('Error submitting Details:', error);
        }
    };

    return (
        <>
            <div className={`chat-message-bottom-bar ${isStreaming ? 'streaming' : ''} ${isLatestMessage ? 'latest' : ''}`}>
                {role === "assistant" && (
                    <>
                        <button className="icon-button small" onClick={handleCopy} data-tooltip="Copy message">
                            <img src={isCopied ? "/static/images/copied-icon.png" : "/static/images/copy-icon.png"} alt={isCopied ? "copied" : "copy"}/>
                        </button>
                        <button className="icon-button small" onClick={handleThumbsUp} data-tooltip={feedbackState.thumbsUpSubmitted ? "Feedback submitted" : "Good response"}>
                            <img src={feedbackState.thumbsUpSubmitted ? "/static/images/thumb-up-filled-icon.png" : "/static/images/thumb-up-icon.png"} alt="Good response" />
                        </button>
                        <button className="icon-button small" onClick={handleThumbsDown} data-tooltip={feedbackState.thumbsDownSubmitted ? "Feedback submitted" : "Bad response"}>
                            <img src={feedbackState.thumbsDownSubmitted ? "/static/images/thumb-down-filled-icon.png" : "/static/images/thumb-down-icon.png"} alt="bad response"/>
                        </button>
                    </>
                )}
            </div>
            {feedbackState.activeSubmenu === 'thumbsDown' && !feedbackState.thumbsDownSubmitted && (
                <ThumbsDownFeedback
                    onSubmit={handleDetailsSubmit}
                    onOtherClick={handleOtherClick}
                    showOtherInput={feedbackState.showOtherInput}
                    otherDetails={feedbackState.otherDetails}
                    setOtherDetails={(value) => setFeedbackState(prev => ({ ...prev, otherDetails: value }))}
                    handleOtherSubmit={handleOtherSubmit}
                />
            )}
        </>
    );
};

const ThumbsDownFeedback = ({ onSubmit, onOtherClick, showOtherInput, otherDetails, setOtherDetails, handleOtherSubmit }) => (
    <div className="feedback-container">
        <p>Thanks for your feedback! What was wrong?</p>
        <div className="feedback-buttons">
            <button className="button secondary no-shrink" onClick={() => onSubmit("Unable to Complete Task")}>
                <span className="light">Failed to complete action</span>
            </button>
            <button className="button secondary no-shrink" onClick={() => onSubmit("Incorrect response")}>
                <span className="light">Incorrect response</span>
            </button>
            <button className="button secondary no-shrink" onClick={() => onSubmit("Poor graph")}>
                <span className="light">Poor graph</span>
            </button>
            <button className="button secondary no-shrink" onClick={() => onSubmit("Did not follow instructions")}>
                <span className="light">Did not follow instructions</span>
            </button>
            <button className="button secondary no-shrink" onClick={onOtherClick}>
                <span className="light">Other</span>
            </button>
        </div>
        {showOtherInput && (
            <div className="other-feedback-input">
                <textarea
                    className="other-feedback-input-field"
                    id="other-feedback-input-field"
                    rows="1"
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleOtherSubmit();
                        }
                    }}
                    placeholder="Please provide details..."
                />
                <button className="button secondary no-shrink" onClick={handleOtherSubmit}>
                    <span>Submit</span>
                </button>
            </div>
        )}
    </div>
);

export default function ChatPage({
	initialMessages,
	availableModels,
	connectedApps,
	threadData,
	modelOverride,
}: ChatPageProps) {
	const [messages, setMessages] = useState(initialMessages);
	const prevMessages = useRef([]);
	const [inputMessage, setInputMessage] = useState('');
	const [isStreaming, setIsStreaming] = useState(false);
	const isStreamingRef = useRef(isStreaming);
	const chatContainerRef = useRef(null);
	const [threadId, setThreadId] = useState(threadData?.thread_id || null);
	const [model, setModel] = useState(() => {
		if (modelOverride && availableModels[modelOverride]) {
			return modelOverride;
		}
		// Check thread data or localStorage
		const thread = threadData;
		
		// Prioritize thread model, then localStorage, then default
        if (thread?.model) {
            return thread.model;
        } else if (localStorage.getItem('lastSelectedModel') && availableModels[localStorage.getItem('lastSelectedModel')]) {
            return localStorage.getItem('lastSelectedModel');
        } else {
            return Object.keys(availableModels)[0];
        }
	});
	const textareaRef = useRef(null);
	const [currentToolCall, setCurrentToolCall] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [retryMessage, setRetryMessage] = useState(null);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const userMessages = useMemo(() => messages.filter(msg => msg.role === 'user').reverse(), [messages]);
	const [connectedAppsState] = useState(connectedApps);
	const [selectedDataSourcesIDs, setSelectedDataSourcesIDs] = useState([]);
	const selectedDataSources = connectedAppsState.filter(app => selectedDataSourcesIDs.includes(app.id));
	const isThreadLocked = !!threadId;
	// New state to track expanded/collapsed state for tool message groups
	const [expandedGroups, setExpandedGroups] = useState({});
	// Add state for model switcher dropdown
        const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
        const modelMenuRef = useRef(null);
        const [autographMode, setAutographMode] = useState(() => {
                const stored = localStorage.getItem('autographMode');
                return stored ? JSON.parse(stored) : true;
        });

        useEffect(() => {
                localStorage.setItem('autographMode', JSON.stringify(autographMode));
        }, [autographMode]);

	// Build artifact data map from props
	const [artifactDataMap, setArtifactDataMap] = useState<Record<string, any>>(() => {
		const allArtifacts = threadData?.artifacts || initialMessages.flatMap(msg => msg.artifacts || []);
		return allArtifacts.reduce((map, artifact) => {
			map[artifact.id] = artifact;
			return map;
		}, {} as Record<string, any>);
	});

	// Handle code copying
	const handleCopyCode = useCallback((codeBlock: HTMLElement) => {
		if (!codeBlock) return;
		
		const copyMessage = codeBlock.querySelector('.copy-message') as HTMLElement;
		const code = codeBlock.querySelector('code')?.innerText || '';
		
		navigator.clipboard.writeText(code).then(() => {
			if (copyMessage) {
				copyMessage.style.visibility = 'visible';
				setTimeout(() => {
					copyMessage.style.visibility = 'hidden';
				}, 2000);
			}
		}).catch(err => {
			console.error('Failed to copy:', err);
		});
	}, []);

	// Make handleCopyCode available globally for markdown renderer
	useEffect(() => {
		(window as any).handleCopyCode = handleCopyCode;
		return () => {
			delete (window as any).handleCopyCode;
		};
	}, [handleCopyCode]);

	// Effect to update lastSelectedModel in localstorage when model changes
	useEffect(() => {
		localStorage.setItem('lastSelectedModel', model);
	}, [model]);

	useEffect(() => {
		isStreamingRef.current = isStreaming;
	}, [isStreaming]);

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

	// Update the artifactDataMap when new artifacts arrive in messages
	useEffect(() => {
		const map = messages
			.flatMap(msg => msg.artifacts || [])
			.reduce((acc, art) => { acc[art.id] = art; return acc; }, {});
		setArtifactDataMap(map);
	}, [messages]);

	// Inside the App component, add this state variable with the other state declarations
	const [connectionIDForKnowledgeBase, setConnectionIDForKnowledgeBase] = useState(null);

	// Set the selected data sources from the initial state
	useEffect(() => {
		const selected = selectedDataSourcesIDs[0];
		const thread = threadData;
		let stored = JSON.parse(localStorage.getItem(`dataSources_${threadId}`));
		// If stored is not in connectedAppsState, set it to the first connected app
		if (stored && !stored.some(id => connectedAppsState.some(app => app.id === id))) {
			stored = [connectedAppsState[0].id];
		}
		
		// If thread has connection_ids, use those
		if (thread.connection_ids?.length > 0) {
			setSelectedDataSourcesIDs(thread.connection_ids);
			return;
		}
		
		// Filter out any null/undefined values from stored array before using it
		const validStored = stored?.filter(id => id != null) || [];
		
		// Set initial data sources, preferring selected over stored over first connected app
		setSelectedDataSourcesIDs(
			selected ? [selected] : 
			validStored.length > 0 ? validStored :
			connectedAppsState[0]?.id ? [connectedAppsState[0].id] : 
			[]
		);
	}, [connectedAppsState]);

	// Data sources
	useEffect(() => {
		// Only store data sources if thread is not locked
		if (!isThreadLocked) {
			const validIds = selectedDataSourcesIDs.filter(id => id != null);
			if (validIds.length > 0) {
				localStorage.setItem(`dataSources_${threadId}`, JSON.stringify(validIds));
			}
		}
	}, [selectedDataSourcesIDs, threadId, isThreadLocked]);

	// Add the handleInputChange function
	const handleInputChange = (e) => {
		const text = e.target.innerText;
		setInputMessage(text);
		adjustTextareaHeight(e.target);
	};

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

	useEffect(() => {
		if (chatContainerRef.current) {
			// Only scroll to bottom if we're near the bottom or this is the first message
			if (isNearBottom() || prevMessages.current.length === 0) {
				chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
			}
			prevMessages.current = messages;
		}
	}, [messages]);

	// -------------- send message stuff
	const eventSourceRef = useRef(null);
        async function sendMessageToServer(message, autograph) {
		setRetryMessage(null);
		setIsStreaming(true);
        setIsLoading(true);

                const payload = {
                        threadId: threadId,
                        model: model,
                        message: message,
                        selectedSources: selectedDataSourcesIDs,
                        autographMode: autograph
                }
        fetch(`/api/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        }).then(response => {
            if (!response.ok) {
                if (response.status === 402) {
                    console.error('paywall triggered');
                    htmx.trigger('#paywall-modal-content', 'showPaywall');
                    setRetryMessage({ 
                        message: message, 
                    errorMessage: 'You have reached your free message limit.'
                    });
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            return response.json();
        }).then(data => {
            if (!threadId) {
                setThreadId(data.threadId);
				const newEvent = new CustomEvent('threadCreated', { detail: { threadId: data.threadId } });
				window.dispatchEvent(newEvent);
            }
            if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
                connectToSSE();
            }
        }).catch(error => {
            console.error('Error sending message:', error);
            setIsStreaming(false);
            setIsLoading(false);
            setRetryMessage({ 
                message: message,
                errorMessage: 'Failed to send message. Please try again.' 
            });
        });
    }

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
			} catch (_){ 
				name = event.data;
			}
			setCurrentToolCall(name);
			if (isNearBottom()) scrollToBottom();
		});

		eventSource.addEventListener('clear_status', (event) => {
            setIsStreaming(true);
			setCurrentToolCall(null);
			setIsLoading(true);
			if (isNearBottom()) {
				scrollToBottom();
			}
		});

		eventSource.addEventListener('thread_renamed', (event) => {
            setIsStreaming(true);
			try {
				if (!event.data) return;
				const { threadId, title } = JSON.parse(event.data);
				window.dispatchEvent(new CustomEvent('threadRenamed', { detail: { threadId, title } }));
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

    useEffect(() => { if (threadId) { connectToSSE(); } }, [threadId]);

	const handleSendMessage = async () => {
		const content = textareaRef.current.innerText.trim();
		if (content === '') return;
	
		setMessages(prev => [...prev, { id: `temp-${Date.now()}`, role: 'user', content }]);
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

	const handleStopStreaming = async () => {
		if (!threadId) return;
		
		try {
			const response = await fetch(`/api/chat/${threadId}/cancel/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				}
			});
			
			if (!response.ok) {
				console.error('Failed to cancel thread:', response.statusText);
			}
		} catch (error) {
			console.error('Error cancelling thread:', error);
		}
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
			const endpoint = threadId 
				? `/api/chat/${threadId}/recommendations/`
				: `/api/chat/recommendations/`;
				
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					dataSources: selectedDataSourcesIDs
				})
			});
	
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
	
			const data = await response.json();
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

	// Effect to handle knowledge base modal visibility
	useEffect(() => {
		const modal = document.querySelector('#knowledge-base-modal');
		if (connectionIDForKnowledgeBase) {
			modal.showModal();
		} else {
			modal.close();
		}
	}, [connectionIDForKnowledgeBase]);

	// Handler to close the knowledge base modal
	const handleCloseKnowledgeBaseModal = () => {
		setConnectionIDForKnowledgeBase(false);
	};


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
		<>
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
											<img 
												src={`/static/images/chevron-up.png`}
												alt="Toggle"
												className={`color-flip-80 ${expandedGroups[group.id] === false ? 'chevron-left' : 'chevron-down'}`}
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
												connectedAppsState={connectedAppsState}
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
											connectedAppsState={connectedAppsState}
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
                    { currentToolCall && (
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
                                                        <button className="button small" onClick={() => sendMessageToServer(retryMessage.message, autographMode)}>Retry</button>
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
					<h1>{userData.has_completed_onboarding ? "Let's get started" : "Your data is connected. Start by asking any question."}</h1>
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
								<div className="chat-ds-container">
									<div className="chat-ds-select-container">
										<button 
											className={`icon-button ${selectedDataSources.length === 0 ? 'no-sources-selected' : ''} ${isThreadLocked ? ' shift-tt-right-zero disabled' : ''}`}
											data-tooltip={isThreadLocked ? "Start a chat to change data" : "Add data source"}
											onClick={() => !isThreadLocked && setIsDataSourceMenuOpen(!isDataSourceMenuOpen)}
											disabled={isThreadLocked}
										>
											<img className="color-flip-80" src="/static/images/square-plus-icon.png" alt="Add"/>
										</button>
										{isDataSourceMenuOpen && !isThreadLocked && (
											<div className={`chat-ds-select-menu ${messages.length > 0 ? 'active-chat' : ''}`} ref={dataSourceMenuRef}>
												<div className="chat-ds-select-menu-scroll-container">
													{connectedApps
														.filter(app => !selectedDataSourcesIDs.includes(app.id))
														.length > 0 ? (
														// Show filtered apps if available
														connectedApps
															.filter(app => !selectedDataSourcesIDs.includes(app.id))
															.map((app) => (
																<button 
																	key={app.id} 
																	className="chat-ds-select-menu-item" 
																	onClick={() => {
																		setSelectedDataSourcesIDs([...selectedDataSourcesIDs, app.id]);
																	}}
																>
																	<img className="chat-ds-tag-icon" src={`/static/images/${app.icon}`} alt={app.name} />
																	<span>{app.account_name}</span>
																</button>
															))
													) : (
														// Show message and button if no apps available
														<div className="chat-ds-select-menu-item">
															<span>No more connections.</span>
														</div>
													)}
													<div className="chat-ds-select-menu-item">
														<a href="/connections/add-connection" className="button text">
															<img className="color-flip-100" src="/static/images/plus-white.png" alt="Add"/>
															<span>Add connection</span>
														</a>
													</div>
												</div>
											</div>
										)}
									</div>
									{selectedDataSources.length > 0 ? (
										selectedDataSources.map((dataSource) => (
											<div key={dataSource.id} className="chat-selected-ds-tag">
												<img className="chat-ds-tag-icon" src={`/static/images/${dataSource?.icon}`} alt={dataSource?.account_name} />
												<span>{dataSource?.account_name}</span>
												<button className="icon-button" data-tooltip="Edit knowledge base" onClick={() => setConnectionIDForKnowledgeBase(dataSource.id)}>
													<img className="color-flip-80" src="/static/images/book-icon.png" alt="Knowledge base"/>
												</button>
												{!isThreadLocked && (
													<button 
														className="icon-button"
														data-tooltip="Remove this data source"
														onClick={() => setSelectedDataSourcesIDs(selectedDataSourcesIDs.filter(id => id !== dataSource.id))}
													>
														<img className="color-flip-80" src="/static/images/x-icon.png" alt="Remove"/>
													</button>
												)}
											</div>
										))
									) : (
										<div className="chat-selected-ds-tag empty">
											<span>No data sources connected!</span>
										</div>
									)}
								</div>
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
                                                <img 
                                                    className="color-flip-80" 
                                                    src="/static/images/chevron-up.png" 
                                                    alt="Model switcher" 
                                                />
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
                                                                    // Redirect to base chat URL for a new chat
                                                                    window.location.href = '/chat';
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
                                                                    <img className="color-flip-80" src="/static/images/checkmark-icon.png" alt="Selected"/>
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
                                        className={`icon-button autograph-toggle ${autographMode ? '' : 'grey-out'}`}
                                        onClick={() => setAutographMode(!autographMode)}
                                        data-tooltip={autographMode ? "Create graphs" : "Do not create graphs"}
                                    >
                                        <img
                                            src={`/static/images/${autographMode ? 'chart-filled-icon.png' : 'chart-icon.png'}`}
                                            alt="Autograph mode"
                                        />
                                    </button>
                                    <button
                                           className="icon-button"
                                           onClick={isStreaming ? handleStopStreaming : handleSendMessage}
                                           aria-label={isStreaming ? 'Stop' : 'Send'}
									>
										{isStreaming ? 
											<img className="text-input-field-icon" src="/static/images/stop-icon.png" alt="Stop"/> :
											<img className="text-input-field-icon" src="/static/images/send-icon.png" alt="Send"/>
										}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
				{messages.length === 0 && (
					<div className="chat-recommendations empty-chat">
						<h3>Recommendations</h3>
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
			{createPortal(<ArtifactPane artifacts={artifacts} />, document.getElementById('artifact-pane'))}
			
			{/* Add portal for KnowledgeBaseModal */}
			{connectionIDForKnowledgeBase && createPortal(
				<KnowledgeBaseModal 
					connectionId={connectionIDForKnowledgeBase}
					onClose={() => setConnectionIDForKnowledgeBase(null)}
				/>,
				document.getElementById('knowledge-base-modal')
			)}
		</>
	);
}

if (document.getElementById('chat-root'))
  ReactDOM.createRoot(document.getElementById('chat-root')).render(<App />);

function Modal() {
    const [isConfirmingDeleteAccount, setIsConfirmingDeleteAccount] = useState(false);
    const [isConfirmingClearHistory, setIsConfirmingClearHistory] = useState(false);
    const temporary_no_delete = true; // Set this to false to re-enable delete options
    const [shortcuts_osType, setshortcuts_osType] = useState('Mac');
    
    // Check if user is enterprise
    const isEnterprise = userData.payment_status_name === 'Enterprise';

    // State to track the active section ('Account' or 'Shortcuts')
    const [activeSection, setActiveSection] = useState('Account');

    const closeModal = () => {
        document.querySelector('#react-modal').close();
    };

    const handleBackdropClick = (e) => {
        if (e.target.tagName === 'DIALOG') {
            closeModal();
        }
    };

    // Function to handle section change
    const handleSectionChange = (section) => {
        setActiveSection(section);
    };

    const handleDeleteClick = () => {
        setIsConfirmingClearHistory(false); // Ensure clear history confirmation is closed
        setIsConfirmingDeleteAccount(true);
    };

    const handleConfirmDelete = () => {
        // Call to deletion API or function here
        alert("Account deleted!"); // Temporary for feedback
        closeModal();
    };

    const handleCancelDelete = () => {
        setIsConfirmingDeleteAccount(false);
    };

    const handleClearHistoryClick = () => {
        setIsConfirmingDeleteAccount(false); // Ensure delete confirmation is closed
        setIsConfirmingClearHistory(true);
    };

    const handleConfirmClearHistory = async () => {
        try {
            const response = await fetch('/delete_all_threads/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for authentication
            });

            if (response.ok) {
                // Redirect the user to index
                window.location.href = '/';
            } else {
                const errorData = await response.json();
                console.error("Error clearing history:", errorData);
                alert("Failed to clear history: " + errorData.message);
            }
        } catch (error) {
            console.error("Error clearing history:", error);
            alert("Failed to clear history. Please try again later.");
        }
    };

    const handleCancelClearHistory = () => {
        setIsConfirmingClearHistory(false);
    };

    const handleEmailClick = () => {
        window.open("mailto:support@camelai.com?subject=Delete%20account%20request", "_blank");
    };

    React.useEffect(() => {
        const dialog = document.querySelector('#react-modal');
        dialog.addEventListener('click', handleBackdropClick);
        return () => dialog.removeEventListener('click', handleBackdropClick);
    }, []);

    return (
        <div className="react-modal-padding">
            <div className="react-modal-content">
                <div className="react-modal-options">
                    <button
                        className={`react-modal-section-header ${activeSection === 'Account' ? 'active' : ''}`}
                        onClick={() => handleSectionChange('Account')}
                    >
                        <img className="color-flip-100" src="/static/images/user-icon.png" alt="User icon" />
                        <h1>Account</h1>
                    </button>
                    <button
                        className={`react-modal-section-header ${activeSection === 'Shortcuts' ? 'active' : ''}`}
                        onClick={() => handleSectionChange('Shortcuts')}
                    >
                        <img className="color-flip-100" src="/static/images/command-icon.png" alt="Command icon" />
                        <h1>Shortcuts</h1>
                    </button>
                </div>
                <div className="react-modal-body">
                    {activeSection === 'Account' && (
                        <>
                            <div className="react-modal-as-element">
                                <p>Account email</p>
                                <p className="element">{userData.email}</p>
                            </div>

                            <hr />

                            <div className="react-modal-as-element">
                                <p>Payment status</p>
                                <p className="element">{userData.payment_status_name}</p>
                            </div>

                            <hr />

                            <div className="react-modal-as-element">
                                <p>Member since</p>
                                <p className="element">{userData.created_at}</p>
                            </div>

                            <hr />

                            <div className="react-modal-as-element">
                                <p>Version</p>
                                <p className="element">0.3.1</p>
                            </div>

                            {!isEnterprise && (
                            <>
							<hr />
                            <div className={`react-modal-as-element ${isConfirmingDeleteAccount ? 'confirmation-message' : ''}`}>
                                <p>Delete account</p>
                                {isConfirmingDeleteAccount ? (
                                    temporary_no_delete ? (
                                        <div className="confirmation-message-text">
                                            <p>To delete your account, please send an email by clicking the button below. Your account will be deleted within 24 hours.</p>
                                            <div className="confirmation-message-buttons">
                                                <button className="alert-button" onClick={handleEmailClick}>
                                                    <span>Send Email</span>
                                                </button>
                                                <button className="button" onClick={handleCancelDelete}>
                                                    <span>Nevermind</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="confirmation-message-text">
                                            <p>Are you sure you want to delete your account? Deleting your account will disconnect all of your apps and pause billing for subscribed users.</p>
                                            <div className="confirmation-message-buttons">
                                                <button className="alert-button" onClick={handleConfirmDelete}>
                                                    <span>Yes, delete my account</span>
                                                </button>
                                                <button className="button" onClick={handleCancelDelete}>
                                                    <span>Nevermind</span>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <button className="button delete" onClick={handleDeleteClick}>
                                        <span>Delete account</span>
                                    </button>
                                )}
                            </div>

                            <hr />

                            <div className={`react-modal-as-element ${isConfirmingClearHistory ? 'confirmation-message' : ''}`}>
                                <p>Clear all chat history</p>
                                {isConfirmingClearHistory ? (
                                    <div className="confirmation-message-text">
                                        <p>Are you sure you want to clear your chat history? This action is irreversible.</p>
                                        <div className="confirmation-message-buttons">
                                            <button className="alert-button" onClick={handleConfirmClearHistory}>
                                                <span>Yes, clear my chat history</span>
                                            </button>
                                            <button className="button" onClick={handleCancelClearHistory}>
                                                <span>Nevermind</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="button delete" onClick={handleClearHistoryClick}>
                                        <span>Clear history</span>
                                    </button>
                                )}
                            </div>
                            </>
                            )}
                        </>
                    )}
					{activeSection === 'Shortcuts' && (
						<>
							<div className="react-modal-as-element os-select">
								<p>Operating system</p>
								<div className="AP-toggle-content-container">
									<button 
										className={`AP-toggle-content-button ${shortcuts_osType === 'Mac' ? 'active' : ''}`} 
										onClick={() => setshortcuts_osType('Mac')}
									>
										Mac
									</button>
									<button 
										className={`AP-toggle-content-button ${shortcuts_osType === 'PC' ? 'active' : ''}`} 
										onClick={() => setshortcuts_osType('PC')}
									>
										PC
									</button>
									<div className="slider"></div>
								</div>
							</div>
							<div className="react-modal-as-element">
								<p>New chat</p>
								<p className="element">
									{shortcuts_osType === 'Mac' ? 'cmd + K' : 'ctrl + K'}
								</p>
							</div>
							<hr />
							<div className="react-modal-as-element">
								<div className="react-modal-element-with-tt">
									<p>Navigate chat history</p>
									<div className="icon-button small small-width" data-tooltip="In an active chat, use this shortcut to access your previously sent messages">
										<img src="/static/images/question-icon.png" alt="Tooltip icon"/>
									</div>
								</div>
								<p className="element">
									{shortcuts_osType === 'Mac' ? 'option + ↑/↓' : 'alt + ↑/↓'}
								</p>
							</div>
						</>
					)}
                </div>
            </div>

            <div className="react-modal-bottom-buttons">
                <button className="button secondary" onClick={closeModal}>
                    <span>Close</span>
                </button>
            </div>
        </div>
    );
}

if (document.getElementById('react-modal'))
	ReactDOM.createRoot(document.getElementById('react-modal')).render(<Modal />);

function Sidebar() {
	const [threads, setThreads] = useState(() => userData.threads);
	const [activeThreadId, setActiveThreadId] = useState(() => {
		const pathParts = window.location.pathname.split('/');
		return pathParts[pathParts.length - 1];
	});

	useEffect(() => {
		const threadCreatedHandler = (event) => {
			setThreads(prevThreads => [{ title: 'New Chat', id: event.detail.threadId, last_modified: Date.now()/1000 }, ...prevThreads]);
			setActiveThreadId(event.detail.threadId);
			window.history.pushState({}, '', `/chat/${event.detail.threadId}`);
		}

		const threadRenamedHandler = (event) => {
			setThreads(prevThreads => {
				const newThreads = [...prevThreads];
				const threadIndex = newThreads.findIndex(thread => thread.id == event.detail.threadId);
				newThreads[threadIndex].title = event.detail.title;
				return newThreads;
			});
		}

		window.addEventListener('threadCreated', threadCreatedHandler);
		window.addEventListener('threadRenamed', threadRenamedHandler);

		return () => {
			window.removeEventListener('threadCreated', threadCreatedHandler);
			window.removeEventListener('threadRenamed', threadRenamedHandler);
		}
	}, []);

	const getDateCategory = (lastModified) => {
		const now = new Date();
		const threadDate = new Date(lastModified * 1000); // Convert Unix timestamp to milliseconds
		
		// Reset time to midnight for accurate day comparison
		now.setHours(0, 0, 0, 0);
		threadDate.setHours(0, 0, 0, 0);
		
		const diffTime = now.getTime() - threadDate.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	  
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays <= 7) return 'Last 7 days';
		if (diffDays <= 30) return 'Last 30 days';
		return 'Over 30 days';
	  };

	let currentCategory = null;

	return (
		<>
			{threads.map((threadInfo, index) => {
				const isActive = activeThreadId == threadInfo.id;
				const category = getDateCategory(threadInfo.last_modified);

				let categoryHeader = null;
				if (category !== currentCategory) {
					currentCategory = category;
					categoryHeader = <div className="thread-category-header">{category}</div>;
				}

				return (
					<React.Fragment key={threadInfo.id}>
						{categoryHeader}
						<div>
							<a 
								href={`/chat/${threadInfo.id}`}
								className={`side-nav-link ${isActive ? 'active-link' : ''}`}
							>
								<span title={threadInfo.title}>{threadInfo.title}</span>
							</a>
						</div>
					</React.Fragment>
				);
			})}
		</>
	);
}

if (document.getElementById('react-sidebar'))
	ReactDOM.createRoot(document.getElementById('react-sidebar')).render(<Sidebar />);

let artifactContext = null;
// -------------------- *** Artifacts Pane *** -------------------- //
function ArtifactPane({ artifacts }) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isOpen, setIsOpen] = useState(
	  document.querySelector('.artifact-pane')?.classList.contains('open') ?? false
	);
	const [isZoomed, setIsZoomed] = useState(false);
	const prevArtifactsLength = useRef(0);
  
	// Update artifact context when current artifact changes
	useEffect(() => {
	  if (artifacts.length === 0) return;
	  
	  const currentArtifact = artifacts[currentIndex];
	  artifactContext = {
		id: currentArtifact.id,
		title: currentArtifact.title,
	  };
	}, [currentIndex]);

	useEffect(() => {
		if (artifacts.length === 0) return;
		
		// Only reset to first artifact if a new one was added
		if (artifacts.length > prevArtifactsLength.current) {
			setCurrentIndex(0);
			setIsOpen(true);
		}
  
		prevArtifactsLength.current = artifacts.length;
	}, [artifacts]);
  
	// Event handler for showing a specific artifact
	useEffect(() => {
	  const handleShowArtifact = (event) => {
		const { artifactId } = event.detail;
		const index = artifacts.findIndex(artifact => artifact.id === artifactId);
		
		if (index !== -1) {
		  setCurrentIndex(index);
		  setIsOpen(true);
		}
	  };
  
	  window.addEventListener('showArtifact', handleShowArtifact);
  
	  return () => {
		window.removeEventListener('showArtifact', handleShowArtifact);
	  };
	}, [artifacts]);
  
	// Handle pane visibility
	useEffect(() => {
	  const artifactPane = document.querySelector('.artifact-pane');
	  if (!artifactPane) return;
  
	  artifactPane.classList.toggle('open', isOpen);
	}, [isOpen]);
  
	// Handle toggle artifact pane event
	useEffect(() => {
	  const handleToggleArtifactPane = () => {
		setIsOpen(prev => {
		  const newIsOpen = !prev;
		  document.cookie = `artifactPaneOpen=${newIsOpen}; path=/; max-age=31536000`;
		  return newIsOpen;
		});
	  };
  
	  // Listen for custom toggle event instead of exposing global function
	  window.addEventListener('toggleArtifactPane', handleToggleArtifactPane);
  
	  return () => {
		window.removeEventListener('toggleArtifactPane', handleToggleArtifactPane);
	  };
	}, []);
  
	// Handler functions
	const handleClose = useCallback(() => {
	  setIsOpen(false);
	  document.cookie = 'artifactPaneOpen=false; path=/; max-age=31536000';
	  
	  const artifactPane = document.querySelector('.artifact-pane');
	  if (artifactPane) {
		artifactPane.classList.remove('open');
	  }
	}, []);
  
	const handleCycle = useCallback((direction) => {
	  if (artifacts.length === 0) return;
  
	  setCurrentIndex(prev => {
		if (direction === 'next') {
		  return Math.min(prev + 1, artifacts.length - 1);
		}
		return Math.max(prev - 1, 0);
	  });
	}, [artifacts.length]);
  
	const handleZoom = useCallback(() => {
	  setIsZoomed(prev => {
		const newIsZoomed = !prev;
		const artifactPane = document.querySelector('.artifact-pane');
		
		if (artifactPane) {
		  artifactPane.classList.toggle('zoomed', newIsZoomed);
		  
		  // Handle Plotly resize after zoom
		  setTimeout(() => {
			const iframe = artifactPane.querySelector('iframe');
			if (!iframe?.contentWindow) return;
  
			const plotlyElement = iframe.contentWindow.document.querySelector('.js-plotly-plot');
			if (plotlyElement && iframe.contentWindow.Plotly) {
			  iframe.contentWindow.Plotly.Plots.resize(plotlyElement);
			}
		  }, 100);
		}
		
		return newIsZoomed;
	  });
	}, []);
  
	// Compute derived state
	const currentArtifact = artifacts[currentIndex];
	const isFirstArtifact = currentIndex === 0 || artifacts.length === 0;
	const isLastArtifact = currentIndex === artifacts.length - 1 || artifacts.length === 0;
  
	return (
	  <Artifact 
		artifact={currentArtifact}
		isActive={isOpen}
		isZoomed={isZoomed}
		onClose={handleClose}
		onCycle={handleCycle}
		onZoom={handleZoom}
		isFirstArtifact={isFirstArtifact}
		isLastArtifact={isLastArtifact}
		hasArtifacts={artifacts.length > 0}
	  />
	);
  }

function Artifact({ artifact, isActive, isZoomed, onClose, onCycle, onZoom, isFirstArtifact, isLastArtifact, hasArtifacts }) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const iframeRef = useRef(null);
    const [availableContentTypes, setAvailableContentTypes] = useState([]);
    const [activeContentType, setActiveContentType] = useState('output');
    
    // New state for dashboard dropdown
    const [dashboards, setDashboards] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoadingDashboards, setIsLoadingDashboards] = useState(false);
    const [selectedDashboard, setSelectedDashboard] = useState(null);
    const [error, setError] = useState(null);
    const [savedToDashboardId, setSavedToDashboardId] = useState(null);
    const [newDashboardTitle, setNewDashboardTitle] = useState('');
    const [showNewDashboardForm, setShowNewDashboardForm] = useState(false);
    
    // New state for RBAC compatibility warning
    const [isCheckingCompatibility, setIsCheckingCompatibility] = useState(false);
    const [compatibilityWarning, setCompatibilityWarning] = useState(null);
    const [dashboardToConfirm, setDashboardToConfirm] = useState(null);

    // Add state for dropdown ref
    const dropdownRef = useRef(null);

    // Add a new state for compatibility data
    const [compatibilityData, setCompatibilityData] = useState(null);

    // Check if any associated connection is deleted
    const hasDeletedConnection = useMemo(() => {
        return artifact?.are_connections_deleted ?? false;
    }, [artifact]);

    // Reset savedToDashboardId when artifact changes
    useEffect(() => {
        setSavedToDashboardId(null);
        setIsDropdownOpen(false);
        setShowNewDashboardForm(false);
        setNewDashboardTitle('');
        setCompatibilityWarning(false);
        setCompatibilityData(null);
        setDashboardToConfirm(null);
    }, [artifact?.id]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data.type === 'contentTypesAvailable') {
                setAvailableContentTypes(event.data.contentTypes);
                setActiveContentType(event.data.activeContentType);
            } else if (event.data.type === 'contentTypeChanged') {
                setActiveContentType(event.data.activeContentType);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const showContent = (contentType) => {
        const iframe = document.getElementsByName('artifactFrame')[0];
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.showContent(contentType);
        }
        setActiveContentType(contentType);
    };
    
    const toggleDescription = () => {
        setIsDescriptionExpanded(!isDescriptionExpanded);
    };

    const onRefresh = () => {
        setIsRefreshing(true);
        console.log("Refreshing artifact");
        fetch(`${artifact.url}?refresh=true`)
            .then(() => {
                iframeRef.current.contentWindow.location.reload();
            })
            .finally(() => {
                setIsRefreshing(false);
            });
    };

    // Function to fetch dashboards
    const fetchDashboards = async () => {
        setIsLoadingDashboards(true);
        try {
            const response = await fetch('/dashboards/api/available', {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch dashboards');
            }
            const data = await response.json();
            setDashboards(data.dashboards); // Assuming the API returns { dashboards: [...] }
        } catch (err) {
            console.error(err);
            setError('Unable to load dashboards.');
        } finally {
            setIsLoadingDashboards(false);
        }
    };

    // Check for compatibility issues before adding to dashboard
    const checkDashboardCompatibility = async (dashboardId) => {
        setIsCheckingCompatibility(true);
        setError(null);
        
        try {
            const response = await fetch('/dashboards/check-artifact-compatibility/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dashboard_id: dashboardId,
                    artifact_id: artifact.id
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to check compatibility');
            }
            
            const data = await response.json();
            
            if (data.has_conflicts) {
                // Store the dashboard ID we're trying to add to
                setDashboardToConfirm(dashboardId);
                
                // Store the compatibility data for use in rendering
                setCompatibilityData(data);
                
                // Create warning message flag (we'll use the data directly in the render)
                setCompatibilityWarning(true);
                return false; // Don't proceed with save yet
            } else if (data.is_externally_shared) {
                // Dashboard is externally shared but no conflicts
                setDashboardToConfirm(dashboardId);
                setCompatibilityData(data);
                setCompatibilityWarning(false);
                return false; // Don't proceed with save yet, show confirmation first
            } else {
                // No conflicts, proceed with save
                setCompatibilityData(null);
                setCompatibilityWarning(false);
                return true;
            }
        } catch (err) {
            console.error(err);
            setError('Error checking dashboard compatibility.');
            setCompatibilityData(null);
            setCompatibilityWarning(false);
            return false;
        } finally {
            setIsCheckingCompatibility(false);
        }
    };

    // Handler for adding artifact to dashboard
    const handleAddToDashboard = async (dashboardId) => {
        // First clear any existing warnings
        setCompatibilityWarning(null);
        setDashboardToConfirm(null);
        
        // Check compatibility first
        const isCompatible = await checkDashboardCompatibility(dashboardId);
        
        // If there are conflicts, the warning will be shown and we return early
        if (!isCompatible) return;
        
        // No conflicts or user confirmed, proceed with adding
        try {
            const response = await fetch(`/dashboards/${dashboardId}/add_artifact/${artifact.id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to add artifact to dashboard');
            }
            
            // Success - save dashboard ID and close dropdown
            setSavedToDashboardId(dashboardId);
            setIsDropdownOpen(false);
            
            // Show success message to user
            const successMessage = document.createElement('div');
            successMessage.className = 'toast success-toast';
            successMessage.innerHTML = `<p>Added to dashboard successfully!</p>`;
            document.body.appendChild(successMessage);
            
            // Remove toast after animation completes
            setTimeout(() => {
                if (successMessage.parentNode) {
                    document.body.removeChild(successMessage);
                }
            }, 4000);
        } catch (err) {
            console.error(err);
            setError('Error adding artifact to dashboard.');
        }
    };

    // Function to confirm adding despite compatibility issues
    const confirmAddToDashboard = () => {
        if (!dashboardToConfirm) return;
        
        // Clear the warning and proceed with add
        setCompatibilityWarning(null);
        
        // Add to dashboard without checking compatibility again
        try {
            fetch(`/dashboards/${dashboardToConfirm}/add_artifact/${artifact.id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to add artifact to dashboard');
                }
                return response.json();
            })
            .then(() => {
                setSavedToDashboardId(dashboardToConfirm);
                setIsDropdownOpen(false);
                setDashboardToConfirm(null);
            })
            .catch(err => {
                console.error(err);
                setError('Error adding artifact to dashboard.');
            });
        } catch (err) {
            console.error(err);
            setError('Error adding artifact to dashboard.');
        }
    };

    // Function to cancel adding when there are compatibility issues
    const cancelAddToDashboard = () => {
        setCompatibilityWarning(null);
        setDashboardToConfirm(null);
    };

    const handleCreateDashboard = async () => {
        if (!newDashboardTitle.trim()) return;
        
        try {
            const response = await fetch('/dashboards/new/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newDashboardTitle,
                    artifact_id: artifact.id
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create dashboard');
            }
            
            const data = await response.json();
            setSavedToDashboardId(data.id);
            setIsDropdownOpen(false);
        } catch (err) {
            console.error(err);
            setError('Failed to create dashboard');
        }
    };

    // Add useEffect for click outside handling
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setShowNewDashboardForm(false); // Reset form state
                setNewDashboardTitle(''); // Clear form input
                setCompatibilityWarning(null); // Clear any warnings
                setDashboardToConfirm(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <>
            <div className="artifact-pane-header">
                <div className="left">
                    {artifact?.app_label && (
                        <img src={`/static/images/${(artifact.app_label || '').toLowerCase()}-logo.png`} alt={artifact.app_label} />
                    )} 
                    <h1 className="artifact-title">{artifact?.title || 'Conversation Artifacts'}</h1>
                </div> 
                <div className="right">
                    <button 
                        onClick={() => onCycle('next')} 
                        className={`icon-button small ${isLastArtifact ? 'disabled' : ''}`} 
                        data-tooltip="Previous Artifact"
                        disabled={isLastArtifact || !hasArtifacts}
                    >
                        <img className="chevron-left" src="/static/images/chevron-up.png" alt="previous artifact" />
                    </button>
                    
                    <button 
                        onClick={() => onCycle('prev')} 
                        className={`icon-button small ${isFirstArtifact ? 'disabled' : ''}`} 
                        data-tooltip="Next Artifact"
                        disabled={isFirstArtifact || !hasArtifacts}
                    >
                        <img className="chevron-right" src="/static/images/chevron-up.png" alt="next artifact" />
                    </button>

                    {artifact?.download_url ? (
                        <a 
                            href={artifact?.download_url} 
                            download={artifact?.filename || artifact?.title}
                            className="icon-button small" 
                            data-tooltip="Download data"
                        >
                            <img src="/static/images/download-icon.png" alt="download artifact" />
                        </a>
                    ) : (
                        <button 
                            className="icon-button small disabled" 
                            data-tooltip="Download data"
                            disabled
                        >
                            <img src="/static/images/download-icon.png" alt="download artifact" />
                        </button>
                    )}

                    <button 
                        onClick={onRefresh} 
                        className={`icon-button small ${isRefreshing ? 'refreshing' : ''}`} 
                        data-tooltip="Refresh"
                        disabled={isRefreshing}
                    >
                        <img src="/static/images/refresh-icon.png" alt="refresh artifact" />
                    </button>

                    <button onClick={onZoom} id="zoom-artifact-btn" className="icon-button small mobile-hidden" data-tooltip={isZoomed ? "Minimize" : "Expand"}>
                        <img id="zoom-artifact-img" src={`/static/images/${isZoomed ? 'minimize' : 'expand'}-icon.png`} alt="expand/minimize artifact" />
                    </button>

                    <button onClick={onClose} className="icon-button small" data-tooltip="Close">
                        <img src="/static/images/x-icon.png" alt="close" />
                    </button>

                </div>
            </div>
            <div className="artifact-pane-body-container">
                <div className="artifact-pane-body-content" id="artifact-pane-content">
                    {artifact ? (
                        <>
							{/* if any associated data source is deleted, show a warning message */}
							{hasDeletedConnection && (
								<div className="data-source-deleted-warning">
									<div className="warning-message mini-font">
										<span>Warning: One or more data sources used in this artifact have been deleted. Results might be incomplete or outdated.</span>
									</div>
								</div>
							)}

                            <div className="artifact-description">
                                    <div className="AP-toggle-content-container">
                                        {availableContentTypes.map(contentType => (
                                            <button 
                                                key={contentType}
                                                className={`AP-toggle-content-button ${activeContentType === contentType ? 'active' : ''}`} 
                                                onClick={() => showContent(contentType)}
                                            >
                                                {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                                            </button>
                                        ))}
                                        <div className="slider"></div>
                                    </div>

								<div className="artifact-actions">
									<div className="dropdown-container">
										{savedToDashboardId ? (
											<a 
												href={`/dashboards/${savedToDashboardId}`}
												className="button secondary small artifact"
												data-tooltip="View in dashboard"
											>
												<span>View</span>
												<img 
													src="/static/images/arrow-right-up-icon.png" 
													alt="View" 
													className="color-flip-80"
												/>
											</a>
										) : (
											<button 
												onClick={() => {
													if (!isDropdownOpen) {
														fetchDashboards();
													}
													setIsDropdownOpen(!isDropdownOpen);
												}}
												className="button secondary small artifact"
												disabled={isLoadingDashboards}
												data-tooltip="Save to dashboard"
											>
												<span>{isLoadingDashboards ? 'Loading...' : 'Save'}</span>
											</button>
										)}

										{isDropdownOpen && (
											<div className="dropdown-menu" ref={dropdownRef}>
												{error && <div className="error-message"><span>{error}</span></div>}
                                                
                                                {/* Combined alert for compatibility and external sharing warnings */}
                                                {dashboardToConfirm && compatibilityData && (
                                                    <div className="dropdown-menu-item db-conflict-message">
                                                        <div className="warning-message">
															<span>{compatibilityWarning ? "Warning!" : "Notice"}</span>
                                                            
                                                            {/* Show groups that will lose access (if any) */}
                                                            {compatibilityData.groups_to_remove && compatibilityData.groups_to_remove.length > 0 && (
                                                                <>
                                                                    <span>This dashboard is shared with the following group{compatibilityData.groups_to_remove.length > 1 ? 's' : ''}:</span>
                                                                    <ul>
                                                                        {compatibilityData.groups_to_remove.map(group => (
                                                                            <li key={group.id || group.name}>{group.name}</li>
                                                                        ))}
                                                                    </ul>
                                                                    <span>They do not have access to view this data.</span>
                                                                    <span>Saving will remove their access.</span>
                                                                </>
                                                            )}
                                                            
                                                            {/* Show external sharing warning (either about removal or visibility) */}
                                                            {compatibilityData.will_remove_view_access ? (
                                                                <>
                                                                    <span>This dashboard is shared externally, but this data source cannot be shared externally.</span>
                                                                    <span>External view-only sharing will be disabled for this dashboard.</span>
                                                                </>
                                                            ) : compatibilityData.is_externally_shared && (
                                                                <>
                                                                    <span>This dashboard is shared externally.</span>
                                                                    {compatibilityData.external_viewer_emails && compatibilityData.external_viewer_emails.length > 0 && (
                                                                        <>
                                                                            <span>Shared with:</span>
                                                                            <ul className="shared-emails-list">
                                                                                {compatibilityData.external_viewer_emails.map((email, index) => (
                                                                                    <li key={index}>{email}</li>
                                                                                ))}
                                                                            </ul>
                                                                            {compatibilityData.external_viewer_count > 3 && (
                                                                                <span className="shared-emails-more">& {compatibilityData.external_viewer_count - 3} more</span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    <span>Adding this artifact will make it visible to external users.</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="warning-message-buttons">
                                                            <button 
                                                                className="button full-width secondary"
                                                                onClick={cancelAddToDashboard}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                className="button full-width"
                                                                onClick={confirmAddToDashboard}
                                                            >
                                                                Save Anyway
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {!dashboardToConfirm && !showNewDashboardForm && (
													<>
														{dashboards.length > 0 && (
															<>
																{dashboards.map(dashboard => (
																	<button
																		key={dashboard.id}
																		className="dropdown-menu-item"
																		onClick={() => handleAddToDashboard(dashboard.id)}
																	>
																		<span>{dashboard.title}</span>
																	</button>
																))}
																<hr />
															</>
														)}
														<button 
															className="dropdown-menu-item"
															onClick={() => setShowNewDashboardForm(true)}
														>
															<span>Create new dashboard</span>
															<img className="color-flip-80" src="/static/images/plus-white.png" alt="plus"/>
														</button>
													</>
                                                )}
												
                                                {!dashboardToConfirm && showNewDashboardForm && (
													<div className="dropdown-menu-form">
														<div className="dropdown-menu-item centered">
															<span className="dropdown-header">Save to new dashboard</span>
														</div>
															
														<input
															type="text"
															placeholder="Name your dashboard"
															className="dropdown-menu-item"
															value={newDashboardTitle}
															onChange={(e) => setNewDashboardTitle(e.target.value)}
															onKeyDown={(e) => {
																if (e.key === 'Enter' && newDashboardTitle.trim()) {
																	e.preventDefault();
																	handleCreateDashboard();
																}
															}}
															autoFocus
														/>
														<div className="dropdown-menu-item centered">
															<button 
																className="button full-width"
																onClick={handleCreateDashboard}
																disabled={!newDashboardTitle.trim()}
															>
																Create and Save
															</button>
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								</div>
                            </div>

                            <iframe className="artifact" src={artifact.url} ref={iframeRef} name="artifactFrame" />
                        </>
                    ) : (
                        <div className="artifact-pane-body-content-empty">
                            <p>No artifacts yet</p>
                            <p>As you chat with camelAI, it will create artifacts that show up here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
