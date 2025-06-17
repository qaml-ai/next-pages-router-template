import React, { useState, useEffect, useRef } from 'react';

function KnowledgeBaseModal({ connectionId, onClose }) {
    const [knowledgeBases, setKnowledgeBases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [canEditKnowledgeBase, setCanEditKnowledgeBase] = useState(true); // Default to true until we know otherwise
    const [orgPaymentStatus, setOrgPaymentStatus] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [connectionOwner, setConnectionOwner] = useState(null);

    const closeModal = () => {
        onClose();
    };

    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const response = await fetchCurrentUserInfo();
                if (!response.ok) throw new Error('Failed to fetch user info');
                const data = await response.json();
                setUserInfo(data);
                setOrgPaymentStatus(data.organization.payment_status);
            } catch (err) {
                console.error('Error fetching user info:', err);
            }
        };

        const loadConnectionInfo = async () => {
            try {
                const response = await fetchConnectionInfo(connectionId);
                if (!response.ok) throw new Error('Failed to fetch connection info');
                const data = await response.json();
                setConnectionOwner(data.created_by);
            } catch (err) {
                console.error('Error fetching connection info:', err);
            }
        };

        loadUserInfo();
        loadConnectionInfo();
    }, [connectionId]);

    useEffect(() => {
        if (userInfo && orgPaymentStatus && connectionOwner) {
            // Determine if user can edit knowledge base
            // If not on Enterprise tier, anyone can edit
            // If on Enterprise tier, only admins, superusers, or the connection owner can edit
            const isEnterprise = orgPaymentStatus === 'ENTERPRISE';
            const isAdmin = userInfo.is_org_admin;
            const isSuperUser = userInfo.is_superuser;
            const isOwner = userInfo.id === connectionOwner;

            setCanEditKnowledgeBase(!isEnterprise || isAdmin || isSuperUser || isOwner);
        }
    }, [userInfo, orgPaymentStatus, connectionOwner]);

    useEffect(() => {
        const loadKnowledgeBases = async () => {
            try {
                console.log('Fetching knowledge bases for connection:', connectionId);
                const response = await fetchKnowledgeBasesApi(connectionId);
                if (!response.ok) {
                    console.error('Failed to fetch knowledge bases:', {
                        status: response.status,
                        statusText: response.statusText,
                    });
                    throw new Error(`Failed to fetch knowledge bases: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                console.log('Received knowledge base data:', data);

                const knowledgeBasesData = data.knowledge_bases?.length > 0
                    ? data.knowledge_bases.map(kb => ({
                        id: kb.id,
                        content: kb.content,
                        otherConnections: kb.other_connections || [],
                    }))
                    : [{ content: '', otherConnections: [] }];

                console.log('Setting knowledge bases:', knowledgeBasesData);
                setKnowledgeBases(knowledgeBasesData);
            } catch (err) {
                console.error('Error in fetchKnowledgeBases:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadKnowledgeBases();
    }, [connectionId]);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            // Filter out empty knowledge bases before saving
            const nonEmptyKnowledgeBases = knowledgeBases.filter(kb => kb.content.trim() !== '');

            const response = await updateKnowledgeBases(
                connectionId,
                nonEmptyKnowledgeBases.map(kb => ({ id: kb.id, content: kb.content })),
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update knowledge bases');
            }

            const responseData = await response.json();

            if (responseData.knowledge_bases) {
                setKnowledgeBases(
                    responseData.knowledge_bases.map(kb => ({
                        id: kb.id,
                        content: kb.content,
                        otherConnections: kb.other_connections || [],
                    })),
                );
            }

            const isConnectionDetailsPage = window.location.pathname.includes(
                `/connections/${connectionId}`,
            );

            closeModal();

            if (isConnectionDetailsPage) {
                window.location.reload();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddItem = () => {
        setKnowledgeBases([...knowledgeBases, { content: '', otherConnections: [] }]);
    };

    const handleRemoveItem = (index) => {
        setKnowledgeBases(knowledgeBases.filter((_, i) => i !== index));
    };

    const handleContentChange = (index, newContent) => {
        const newKnowledgeBases = [...knowledgeBases];
        newKnowledgeBases[index] = {
            ...newKnowledgeBases[index],
            content: newContent
        };
        setKnowledgeBases(newKnowledgeBases);
    };

    const dialogRef = useRef(null);

    // Show dialog on mount; listen for native cancel (esc or click outside)
    useEffect(() => {
        const dlg = dialogRef.current;
        if (!dlg) return;
        if (typeof dlg.showModal === 'function') {
            dlg.showModal();
        } else {
            dlg.setAttribute('open', '');
        }
        const handleCancel = (event) => {
            event.preventDefault();
            onClose();
        };
        dlg.addEventListener('cancel', handleCancel);
        return () => dlg.removeEventListener('cancel', handleCancel);
    }, [onClose]);

    return (
        <dialog ref={dialogRef} className="modal kb-modal">
            {isLoading ? (
                <div className="react-modal-padding">
                    <div className="loading-spinner" />
                </div>
            ) : (
                <div className="react-modal-padding overflow-hidden">
                    <div className="kb-modal-content">
                        <h2>Knowledge Base</h2>

                        {canEditKnowledgeBase ? (
                            <p>Add additional context that should be used when querying this data source.</p>
                        ) : (
                            <p>These are the things camelAI will keep in mind when you ask questions about this data source.</p>
                        )}

                        {error && (
                            <div className="kb-error-message">
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="kb-container">
                            {knowledgeBases.map((kb, index) => (
                                <div key={index} className={`kb-item ${index === knowledgeBases.length - 1 ? 'no-border' : ''}`}>
                                    {canEditKnowledgeBase ? (
                                        <>
                                            <div className="kb-item-content">
                                                <div
                                                    className="kb-input"
                                                    contentEditable={true}
                                                    onInput={(e) => {
                                                        // Adjust height based on content
                                                        e.target.style.height = 'auto';
                                                        const newHeight = Math.min(e.target.scrollHeight, 60); // 60px max height
                                                        e.target.style.height = `${Math.max(20, newHeight)}px`; // minimum 20px

                                                        // Update content in state
                                                        handleContentChange(index, e.target.innerText);
                                                    }}
                                                    onPaste={(e) => {
                                                        e.preventDefault();
                                                        const text = e.clipboardData.getData('text/plain');
                                                        document.execCommand('insertText', false, text);
                                                    }}
                                                    suppressContentEditableWarning={true}
                                                    ref={(element) => {
                                                        // Set initial content and maintain cursor position
                                                        if (element && element.innerText !== kb.content) {
                                                            const selection = window.getSelection();
                                                            // Check if selection exists and has ranges
                                                            let cursorOffset = 0;

                                                            if (selection && selection.rangeCount > 0) {
                                                                const range = selection.getRangeAt(0);
                                                                cursorOffset = range.startOffset;
                                                            }

                                                            element.innerText = kb.content;

                                                            // Restore cursor position
                                                            if (document.activeElement === element && selection) {
                                                                try {
                                                                    const newRange = document.createRange();
                                                                    // Make sure we have a text node to set position on
                                                                    if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
                                                                        newRange.setStart(element.firstChild, Math.min(cursorOffset, element.innerText.length));
                                                                        newRange.collapse(true);
                                                                        selection.removeAllRanges();
                                                                        selection.addRange(newRange);
                                                                    }
                                                                } catch (e) {
                                                                    console.error("Could not restore cursor position:", e);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    role="textbox"
                                                    aria-multiline="true"
                                                    data-placeholder="Active users are defined as someone who logs in at least once a week."
                                                />
                                                <button
                                                    className="icon-button shift-tt-left small"
                                                    onClick={() => handleRemoveItem(index)}
                                                    data-tooltip="Remove item"
                                                >
                                                    <img src="/static/images/trash-icon.png" alt="Remove" />
                                                </button>
                                            </div>
                                            {kb.otherConnections && kb.otherConnections.length > 0 && (
                                                <div className="kb-data-source-badges">
                                                    <span className="kb-badge-label">Used for other data sources: </span>
                                                    {kb.otherConnections.map((conn, i) => (
                                                        <span key={i} className="kb-data-source-badge">
                                                            {conn.account_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="kb-readonly-item">
                                            {kb.content || "(Empty item)"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {canEditKnowledgeBase ? (
                            <button
                                className="button text"
                                onClick={handleAddItem}
                            >
                                <span>+ Add Item</span>
                            </button>
                        ) : (
                            <div className="kb-readonly-message">
                                <p>Only Admins can edit this information. Please contact your camelAI Admin to update.</p>
                            </div>
                        )}
                        <div className="react-modal-bottom-buttons">
                            <button className="button secondary" onClick={onClose}>
                                <span>Cancel</span>
                            </button>
                            {canEditKnowledgeBase && (
                                <button
                                    className="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </dialog>
    );
}

export default KnowledgeBaseModal; 