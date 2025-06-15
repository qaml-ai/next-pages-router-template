import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import KnowledgeBaseModal from './KnowledgeBaseModal';

function KnowledgeBaseModalStandalone() {
    const [modalState, setModalState] = useState({
        isOpen: false,
        connectionId: null
    });

    useEffect(() => {
        // Listen for the custom event from non-React pages
        const handleOpenModal = (event) => {
            setModalState({
                isOpen: true,
                connectionId: event.detail.connectionId
            });
        };

        window.addEventListener('openKnowledgeBaseModal', handleOpenModal);

        return () => {
            window.removeEventListener('openKnowledgeBaseModal', handleOpenModal);
        };
    }, []);

    const closeModal = () => {
        setModalState({
            isOpen: false,
            connectionId: null
        });
    };

    if (!modalState.isOpen) {
        return null;
    }

    return (
        <KnowledgeBaseModal
            connectionId={modalState.connectionId}
            onClose={closeModal}
        />
    );
}

// Mount the component when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('knowledge-base-modal-root');
    if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<KnowledgeBaseModalStandalone />);
    }
});