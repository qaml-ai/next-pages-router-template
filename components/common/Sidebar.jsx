import React, { useState, useEffect, Fragment } from 'react';

function Sidebar({ userData }) {
    const [threads, setThreads] = useState(() => userData.threads);
    const [activeThreadId, setActiveThreadId] = useState(() => {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    });

    useEffect(() => {
        const threadCreatedHandler = (event) => {
            setThreads(prevThreads => [{ title: 'New Chat', id: event.detail.threadId, last_modified: Date.now() / 1000 }, ...prevThreads]);
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
                    <Fragment key={threadInfo.id}>
                        {categoryHeader}
                        <div>
                            <a
                                href={`/chat/${threadInfo.id}`}
                                className={`side-nav-link ${isActive ? 'active-link' : ''}`}
                            >
                                <span title={threadInfo.title}>{threadInfo.title}</span>
                            </a>
                        </div>
                    </Fragment>
                );
            })}
        </>
    );
}

export default Sidebar;