import React, { useCallback } from 'react';
import hljs from 'highlight.js';
import {
    Square2StackIcon,
    LightBulbIcon,
    TableCellsIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { renderMarkdown } from '../utils/markdown';

const ToolCalls = React.memo(({ tool_calls, scrollToBottom, connectedApps }) => {
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

        let selectedConnection = connectedApps.find(app => app.id === input.connection_id);
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
                                            <TableCellsIcon
                                                className="tool-call-logo heroicon "
                                                aria-label="Table"
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
                                                            onClick={(e) => window.copyCode(e.target.closest('.code-block'))}
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <Square2StackIcon className="heroicon " aria-label="Copy" />
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
                                            <CodeBracketIcon
                                                className="tool-call-logo heroicon"
                                                aria-label="Code"
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
                                                            onClick={(e) => window.copyCode(e.target.closest('.code-block'))}
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <Square2StackIcon className="heroicon " aria-label="Copy" />
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
                                            <ChartBarIcon
                                                className="tool-call-logo heroicon "
                                                aria-label="Chart"
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
                                                            onClick={(e) => window.copyCode(e.target.closest('.code-block'))}
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <Square2StackIcon className="heroicon " aria-label="Copy" />
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
                                            <LightBulbIcon
                                                className="tool-call-logo heroicon "
                                                aria-label="Thinking"
                                            />
                                        </div>
                                        Planning
                                    </div>
                                    <div className="tool-call-body-content">
                                        <div className="tool-call-planning"
                                            dangerouslySetInnerHTML={renderMarkdown(input.thought)} />
                                    </div>
                                </>
                            );

                        case 'search':
                            return (
                                <>
                                    <div className="tool-call-header">
                                        <div className="tool-call-header-icon">
                                            <MagnifyingGlassIcon
                                                className="tool-call-logo heroicon "
                                                aria-label="Search"
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
                                            <TableCellsIcon
                                                className="tool-call-logo heroicon "
                                                aria-label="Table"
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
                                                    // Find the connection details from connectedApps
                                                    const connectionDetails = connectedApps.find(app => app.id === query.connection_id) || {};
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
                                                            onClick={(e) => window.copyCode(e.target.closest('.code-block'))}
                                                            data-tooltip="Copy code block"
                                                        >
                                                            <Square2StackIcon className="heroicon " aria-label="Copy" />
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
                                            <ChartBarIcon
                                                className="tool-call-logo heroicon "
                                                aria-label="Chart"
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
                                                    // Find the connection details from connectedApps
                                                    const connectionDetails = connectedApps.find(app => app.id === query.connection_id) || {};
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
                                                                onClick={(e) => window.copyCode(e.target.closest('.code-block'))}
                                                                data-tooltip="Copy code block"
                                                            >
                                                                <Square2StackIcon className="heroicon " aria-label="Copy" />
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
    }, [connectedApps]);

    return (
        <>
            {tool_calls.map(renderToolCall)}
        </>
    );
});

export default ToolCalls;