import React, { useState } from 'react';
import {
    HandThumbUpIcon,
    HandThumbDownIcon,
    Square2StackIcon,
} from '@heroicons/react/24/outline';
import {
    HandThumbUpIcon as HandThumbUpIconSolid,
    HandThumbDownIcon as HandThumbDownIconSolid,
    Square2StackIcon as Square2StackIconSolid,
} from '@heroicons/react/24/solid';
import ThumbsDownFeedback from './ThumbsDownFeedback';
import { submitThumbsUp, submitThumbsDown } from '../api';

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
            // Prepare message contents for feedback
            const userMessageContent = prevMessage
                ? typeof prevMessage.content === 'string'
                    ? prevMessage.content
                    : Array.isArray(prevMessage.content)
                        ? prevMessage.content.filter(part => part.type === 'text').map(part => part.text).join('')
                        : prevMessage.content?.content || ''
                : '';
            const botMessageContent = typeof message.content === 'string'
                ? message.content
                : Array.isArray(message.content)
                    ? message.content.filter(part => part.type === 'text').map(part => part.text).join('')
                    : message.content?.content || '';

            try {
                const response = await submitThumbsUp({
                    user_message: userMessageContent,
                    chat_bot_message: botMessageContent,
                    message_id: message.id,
                    thread_id: threadId,
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                setFeedbackState(prev => ({
                    ...prev,
                    thumbsUpSubmitted: true,
                    activeSubmenu: null
                }));
            } catch (error) {
                console.error('Error submitting thumbs up:', error);
            }
        }
    };


    const handleDetailsSubmit = async (reason, details) => {
        // Prepare message contents for feedback
        const userMessageContent = prevMessage
            ? typeof prevMessage.content === 'string'
                ? prevMessage.content
                : Array.isArray(prevMessage.content)
                    ? prevMessage.content.filter(part => part.type === 'text').map(part => part.text).join('')
                    : prevMessage.content?.content || ''
            : '';
        const botMessageContent = typeof message.content === 'string'
            ? message.content
            : Array.isArray(message.content)
                ? message.content.filter(part => part.type === 'text').map(part => part.text).join('')
                : message.content?.content || '';

        try {
            const response = await submitThumbsDown({
                reason,
                details,
                user_message: userMessageContent,
                chat_bot_message: botMessageContent,
                message_id: message.id,
                thread_id: threadId,
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Details submitted successfully:', data);
            setFeedbackState(prev => ({
                ...prev,
                activeSubmenu: null,
                thumbsDownSubmitted: true,
                showOtherInput: false,
                otherDetails: ''
            }));
        } catch (error) {
            console.error('Error submitting thumbs down:', error);
        }
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


    return (
        <>
            <div className={`chat-message-bottom-bar ${isStreaming ? 'streaming' : ''} ${isLatestMessage ? 'latest' : ''}`}>
                {role === "assistant" && (
                    <>
                        <button className="icon-button" onClick={handleCopy} data-tooltip="Copy message">
                            {isCopied ? (
                                <Square2StackIconSolid className="heroicon" aria-label="Copied" />
                            ) : (
                                <Square2StackIcon className="heroicon" aria-label="Copy" />
                            )}
                        </button>
                        <button className="icon-button" onClick={handleThumbsUp} data-tooltip={feedbackState.thumbsUpSubmitted ? "Feedback submitted" : "Good response"}>
                            {feedbackState.thumbsUpSubmitted ? (
                                <HandThumbUpIconSolid className="heroicon" aria-label="Good response" />
                            ) : (
                                <HandThumbUpIcon className="heroicon" aria-label="Good response" />
                            )}
                        </button>
                        <button className="icon-button" onClick={handleThumbsDown} data-tooltip={feedbackState.thumbsDownSubmitted ? "Feedback submitted" : "Bad response"}>
                            {feedbackState.thumbsDownSubmitted ? (
                                <HandThumbDownIconSolid className="heroicon" aria-label="Bad response" />
                            ) : (
                                <HandThumbDownIcon className="heroicon" aria-label="Bad response" />
                            )}
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

export default ChatMessageBottomBar;