# React Components Structure

This directory contains the modularized React components that were previously in a single `react-components.jsx` file.

## Directory Structure

```
react-components/
├── chat/                    # Chat-related components
│   ├── App.jsx             # Main chat application component
│   ├── ChatMessage.jsx     # Individual chat message component
│   ├── ChatMessageBottomBar.jsx  # Chat message action bar
│   ├── TextMessagePart.jsx # Text content renderer
│   ├── ThumbsDownFeedback.jsx  # Feedback form component
│   └── ToolCalls.jsx       # Tool call visualization
├── artifact/               # Artifact display components
│   ├── ArtifactPane.jsx   # Container for artifacts
│   └── Artifact.jsx       # Individual artifact display
├── common/                 # Shared components
│   └── Sidebar.jsx        # Thread navigation sidebar
├── modals/                 # Modal components
│   └── Modal.jsx          # Account settings modal
├── utils/                  # Utility functions
│   └── markdown.js        # Markdown rendering utilities
└── index.js               # Central export file

```

## Component Descriptions

### Chat Components
- **App.jsx**: Main chat application component that manages messages, streaming, and thread state
- **ChatMessage.jsx**: Renders individual messages with appropriate styling and actions
- **ChatMessageBottomBar.jsx**: Provides copy, thumbs up/down feedback actions
- **TextMessagePart.jsx**: Handles text content rendering with markdown support
- **ThumbsDownFeedback.jsx**: Feedback form for negative responses
- **ToolCalls.jsx**: Visualizes AI tool usage (queries, charts, code execution)

### Artifact Components
- **ArtifactPane.jsx**: Manages artifact display state and navigation
- **Artifact.jsx**: Renders individual artifacts with actions (save to dashboard, download, refresh)

### Common Components
- **Sidebar.jsx**: Thread list navigation with date categorization

### Modal Components
- **Modal.jsx**: Account settings and keyboard shortcuts modal

### Utilities
- **markdown.js**: Markdown rendering with syntax highlighting and math support

## Usage

Import components from the index file:

```javascript
import { App, ChatMessage, Sidebar } from './react-components';
```

Or import directly from component files:

```javascript
import App from './react-components/chat/App';
```

## Initialization

The App, Modal, and Sidebar components include their own initialization code that runs when the DOM is ready. They look for specific DOM elements:
- App: `#chat-root`
- Modal: `#react-modal`
- Sidebar: `#react-sidebar`