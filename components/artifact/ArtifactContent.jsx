import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

function ArtifactContent({ artifact, activeContentType }) {
    const [plotlyData, setPlotlyData] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    const codeRef = useRef(null);

    useEffect(() => {
        // Load syntax highlighting for code blocks
        if ((activeContentType === 'code' || activeContentType === 'query') && window.hljs && codeRef.current) {
            window.hljs.highlightElement(codeRef.current);
        }
    }, [activeContentType, artifact]);

    useEffect(() => {
        // Parse Plotly data if available
        if (artifact?.plotly_json) {
            console.log('Artifact plotly_json:', artifact.plotly_json);
            try {
                setPlotlyData(artifact.plotly_json);
            } catch (e) {
                console.error('Failed to parse Plotly data:', e);
            }
        }
    }, [artifact?.plotly_json]);

    // Listen for theme changes
    useEffect(() => {
        const handleThemeChange = (e) => {
            setIsDarkMode(e.matches);
        };

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', handleThemeChange);
        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
    }, []);


    if (!artifact) return null;

    // Render graph content
    if (activeContentType === 'graph' && plotlyData) {
        const themeData = isDarkMode ? plotlyData.dark : plotlyData.light;

        if (!themeData) return null;

        return (
            <div className="artifact">
                <Plot
                    data={themeData.data}
                    layout={themeData.layout}
                    config={{ responsive: true }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        );
    }

    // Render table content
    if (activeContentType === 'table') {
        return (
            <div className="artifact">
                <div className="table-container">
                    <div dangerouslySetInnerHTML={{ __html: artifact.html_table }} />
                    {artifact.is_too_large && (
                        <div className="remaining-rows-message">
                            {artifact.remaining_rows} rows remaining.{' '}
                            <a className="link-primary" href={`/artifacts/${artifact.id}/file/`} download>
                                Download
                            </a>{' '}
                            to view.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Render query content
    if (activeContentType === 'query') {
        const isFeederatedQuery = artifact.type === 'FEDERATED';
        let queryContent = artifact.query;

        // Format JSON for federated queries
        if (isFeederatedQuery) {
            try {
                const jsonData = JSON.parse(artifact.query);
                queryContent = JSON.stringify(jsonData, null, 2);
            } catch (e) {
                console.error('Failed to parse federated query:', e);
            }
        }

        return (
            <div className="artifact-code-container">
                <pre>
                    <code
                        ref={codeRef}
                        className={isFeederatedQuery ? 'language-json' : 'language-sql'}
                    >
                        {queryContent}
                    </code>
                </pre>
            </div>
        );
    }

    // Render code content
    if (activeContentType === 'code' && artifact.python_code) {
        return (
            <div className="artifact-code-container">
                <pre>
                    <code ref={codeRef} className="language-python">
                        {artifact.python_code}
                    </code>
                </pre>
            </div>
        );
    }

    return null;
}

export default ArtifactContent;