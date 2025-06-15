import React from 'react';
import { renderMarkdown } from '../utils/markdown';

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

export default TextMessagePart;