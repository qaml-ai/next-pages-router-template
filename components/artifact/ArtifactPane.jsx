import React, { useState, useEffect, useRef, useCallback } from 'react';
import Artifact from './Artifact';

function ArtifactPane({ artifacts }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(
        document.querySelector('.artifact-pane')?.classList.contains('open') ?? false
    );
    const [isZoomed, setIsZoomed] = useState(false);
    const prevArtifactsLength = useRef(0);

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

    // Expose toggle function to window
    useEffect(() => {
        window.toggleArtifactPane = () => setIsOpen(prev => {
            const newIsOpen = !prev;
            document.cookie = `artifactPaneOpen=${newIsOpen}; path=/; max-age=31536000`;
            return newIsOpen;
        });

        return () => {
            delete window.toggleArtifactPane;
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
                // Resize immediately and again after the CSS transition for correct Plotly layout
                //   window.dispatchEvent(new Event('resize'));
                setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
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

export default ArtifactPane;