'use client'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'

export interface ChatPageProps {
  initialMessages: any[]
  availableModels: Record<string, any>
  connectedApps: any[]
  threadData: any
  modelOverride: string | null
}

/**
 * ChatPage: client‑side component. Receives all initial data via props.
 * Migrate your existing app/page.tsx logic here: state hooks, renderMarkdown,
 * ToolCalls, copy handler, event listeners, etc.
 */
export default function ChatPage({
  initialMessages,
  availableModels,
  connectedApps,
  threadData,
  modelOverride,
}: ChatPageProps) {
  // TODO: migrate the entire page.tsx client logic inside this component,
  // replacing all document.getElementById(...) and window.* scrapes
  // with the props passed in above.
  return <div>ChatPage client content goes here.</div>
}