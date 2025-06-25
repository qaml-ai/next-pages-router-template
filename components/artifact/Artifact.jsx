import React, { useState, useRef, useEffect, useMemo } from 'react';
import ArtifactContent from './ArtifactContent';
import {
    XMarkIcon,
    ArrowTopRightOnSquareIcon,
    ArrowDownTrayIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { getDatabaseLogo } from '../images';

function Artifact({ artifact, isZoomed, onClose, onCycle, onZoom, isFirstArtifact, isLastArtifact, hasArtifacts }) {
    const [availableContentTypes, setAvailableContentTypes] = useState([]);
    const [activeContentType, setActiveContentType] = useState('output');

    // New state for dashboard dropdown
    const [dashboards, setDashboards] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoadingDashboards, setIsLoadingDashboards] = useState(false);
    const [error, setError] = useState(null);
    const [savedToDashboardId, setSavedToDashboardId] = useState(null);
    const [newDashboardTitle, setNewDashboardTitle] = useState('');
    const [showNewDashboardForm, setShowNewDashboardForm] = useState(false);

    // New state for RBAC compatibility warning
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

    // Determine available content types based on artifact data
    useEffect(() => {
        if (!artifact) {
            setAvailableContentTypes([]);
            return;
        }

        console.log('Artifact data:', artifact);
        const types = [];
        if (artifact.plotly_file || artifact.plotly_json) {
            types.push('graph');
        }
        if (artifact.data_file || artifact.html_table) {
            types.push('table');
        }
        if (artifact.python_code) {
            types.push('code');
        }
        types.push('query'); // Always available

        setAvailableContentTypes(types);
        console.log('Available content types:', types);

        // Set initial active content type
        if (types.length > 0) {
            setActiveContentType(types[0] === 'graph' ? 'graph' : 'table');
        }
    }, [artifact]);

    const showContent = (contentType) => {
        setActiveContentType(contentType);
    };


    // Function to fetch dashboards
    const fetchDashboards = async () => {
        setIsLoadingDashboards(true);
        try {
            const response = await fetchAvailableDashboards();
            if (!response.ok) {
                throw new Error('Failed to fetch dashboards');
            }
            const data = await response.json();
            setDashboards(data.dashboards);
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
            const response = await checkArtifactCompatibility(
                dashboardId,
                artifact.id
            );

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
            const response = await addArtifactToDashboard(
                dashboardId,
                artifact.id
            );
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
            addArtifactToDashboard(
                dashboardToConfirm,
                artifact.id
            )
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
            const response = await createDashboard(
                newDashboardTitle,
                artifact.id
            );

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
                        <img src={getDatabaseLogo(artifact.app_label)} alt={artifact.app_label} />
                    )}
                    <h1 className="artifact-title">{artifact?.title || 'Conversation Artifacts'}</h1>
                </div>
                <div className="right">
                    <button
                        onClick={() => onCycle('next')}
                        className={`icon-button ${isLastArtifact ? 'disabled' : ''}`}
                        data-tooltip="Previous Artifact"
                        disabled={isLastArtifact || !hasArtifacts}
                    >
                        <ChevronLeftIcon className={`heroicon ${isLastArtifact ? 'color-mode-40' : ''}`} aria-label="previous artifact" />
                    </button>

                    <button
                        onClick={() => onCycle('prev')}
                        className={`icon-button ${isFirstArtifact ? 'disabled' : ''}`}
                        data-tooltip="Next Artifact"
                        disabled={isFirstArtifact || !hasArtifacts}
                    >
                        <ChevronRightIcon className={`heroicon ${isFirstArtifact ? 'color-mode-40' : ''}`} aria-label="next artifact" />
                    </button>

                    {artifact?.download_url ? (
                        <a
                            href={artifact?.download_url}
                            download={artifact?.filename || artifact?.title}
                            className="icon-button"
                            data-tooltip="Download data"
                        >
                            <ArrowDownTrayIcon className="heroicon" aria-label="download artifact" />
                        </a>
                    ) : (
                        <button
                            className="icon-button disabled"
                            data-tooltip="Download data"
                            disabled
                        >
                            <ArrowDownTrayIcon className="heroicon" aria-label="download artifact" />
                        </button>
                    )}

                    <button onClick={onZoom} id="zoom-artifact-btn" className="icon-button mobile-hidden" data-tooltip={isZoomed ? "Minimize" : "Expand"}>
                        {isZoomed ? (
                            <ArrowsPointingInIcon id="zoom-artifact-img" className="heroicon" aria-label="Minimize artifact" />
                        ) : (
                            <ArrowsPointingOutIcon id="zoom-artifact-img" className="heroicon" aria-label="Expand artifact" />
                        )}
                    </button>

                    <button onClick={onClose} className="icon-button" data-tooltip="Close">
                        <XMarkIcon className="heroicon" aria-label="close" />
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
                                                <ArrowTopRightOnSquareIcon className="heroicon " aria-label="View" />
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
                                                            <PlusIcon className="heroicon" aria-label="Create new dashboard" />
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

                            <ArtifactContent
                                artifact={artifact}
                                activeContentType={activeContentType}
                                onContentTypeChange={setActiveContentType}
                            />
                        </>
                    ) : (
                        // this should never show up
                        <div className="artifact-pane-body-content-empty">
                            <p>No artifacts yet</p>
                            <p>As you chat, artifacts will show up here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default Artifact;