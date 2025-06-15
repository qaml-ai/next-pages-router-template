/**
 * Dashboard-related API calls
 */
export function fetchAvailableDashboards() {
    return fetch('/dashboards/api/available', {
        headers: { 'Content-Type': 'application/json' },
    });
}

export function checkArtifactCompatibility(dashboardId, artifactId) {
    return fetch('/dashboards/check-artifact-compatibility/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dashboard_id: dashboardId, artifact_id: artifactId }),
    });
}

export function addArtifactToDashboard(dashboardId, artifactId) {
    return fetch(`/dashboards/${dashboardId}/add_artifact/${artifactId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

export function createDashboard(title, artifactId) {
    return fetch('/dashboards/new/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, artifact_id: artifactId }),
    });
}

/**
 * Thread history clearing
 */
export function deleteAllThreads() {
    return fetch('/delete_all_threads/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
}

/**
 * Chat-related API calls
 */
export function sendMessage(payload) {
    return fetch('/api/sendMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
}

export function cancelChatThread(threadId) {
    return fetch(`/api/chat/${threadId}/cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

export function fetchRecommendations(threadId, dataSources) {
    const endpoint = threadId
        ? `/api/chat/${threadId}/recommendations/`
        : `/api/chat/recommendations/`;
    return fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataSources }),
    });
}

/**
 * Feedback API calls
 */
export function submitThumbsUp({ user_message, chat_bot_message, message_id, thread_id }) {
    return fetch('/api/submit_thumbs_up/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_message, chat_bot_message, message_id, thread_id }),
    });
}

export function submitThumbsDown({ reason, details, user_message, chat_bot_message, message_id, thread_id }) {
    return fetch('/api/submit_thumbs_down/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, details, user_message, chat_bot_message, message_id, thread_id }),
    });
}

/**
 * Knowledge base API calls
 */
export function fetchCurrentUserInfo() {
    return fetch('/api/current-user-info', {
        headers: { 'Content-Type': 'application/json' },
    });
}

export function fetchConnectionInfo(connectionId) {
    return fetch(`/api/connections/${connectionId}`, {
        headers: { 'Content-Type': 'application/json' },
    });
}

export function fetchKnowledgeBases(connectionId) {
    return fetch(`/connections/${connectionId}/knowledge-base`, {
        headers: { 'Content-Type': 'application/json' },
    });
}

export function updateKnowledgeBases(connectionId, knowledgeBases) {
    return fetch(`/connections/${connectionId}/knowledge-base`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ knowledge_bases: knowledgeBases }),
    });
}