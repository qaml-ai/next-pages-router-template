import React, { useState } from 'react';
import { deleteAllThreads } from '../api';

function Modal({ userData }) {
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
            const response = await deleteAllThreads();

            if (response.ok) {
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
                                    <div className="icon-button small-width" data-tooltip="In an active chat, use this shortcut to access your previously sent messages">
                                        <img src="/static/images/question-icon.png" alt="Tooltip icon" />
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

export default Modal;