import type { GetServerSideProps } from 'next'
import React, { useMemo, useEffect, useState } from 'react'
import App from '../components/chat/App'
import { CamelClient } from '../components/camelClient'

interface IndexProps {
  initialMessages: any[]
  availableModels: Record<string, any>
  connectedApps: any[]
  threadData: any
  modelOverride: string | null
  selectedDataSource: any
  userData: any
}

export default function Index({
  initialMessages,
  availableModels,
  connectedApps,
  threadData,
  modelOverride,
  selectedDataSource,
  userData,
}: IndexProps) {
  const getAccessToken = async () => {
    const response = await fetch('/api/token', { method: 'POST' });
    return response.ok ? response.text() : null;
  };

  // Create camelClient instance with useMemo to persist across renders
  // Token caching is now handled inside the CamelClient itself
  const camelClient = useMemo(() => new CamelClient(getAccessToken), []);

  // The App component is client-side only, so we need to wait for it to mount
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  return (
    <App
      camelClient={camelClient}
      initialMessages={initialMessages}
      availableModels={availableModels}
      connectedApps={connectedApps}
      threadData={threadData}
      modelOverride={modelOverride}
      selectedDataSource={selectedDataSource}
      userData={userData}
    />
  )
}

export const getServerSideProps: GetServerSideProps<IndexProps> = async ({ req, query }) => {
  
  // IMPORTANT: Set this to the ID of the data source you want to use
  const selectedDataSource = 1
  
  const userData = {
    id: null,
    name: 'Anonymous User',
    email: null,
  }

  const connectedApps: any[] = []
  const initialMessages: any[] = []
  const threadData = { thread_id: null }
  const modelOverride = null
  const availableModels = {
    'o3': { name: 'o3', description: 'Most capable model' },
    'o4-mini': { name: 'o4-mini', description: 'Fast and efficient' }
  }

  return {
    props: { 
      initialMessages, 
      availableModels, 
      connectedApps, 
      threadData, 
      modelOverride, 
      selectedDataSource, 
      userData 
    },
  }
}