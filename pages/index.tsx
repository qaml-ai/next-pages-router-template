import type { GetServerSideProps } from 'next'
import React from 'react'
import App from '../components/chat/App'

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
  // Create a function to fetch access token from the API endpoint
  const getAccessToken = async () => {
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.status}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Failed to fetch access token:', error);
      // Fallback to userData?.accessToken if API fails
      return userData?.accessToken;
    }
  };

  return (
    <App
      getAccessToken={getAccessToken}
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
  // Mock data for testing
  const initialMessages: any[] = []
  
  const availableModels = {
    'gpt-4': { name: 'GPT-4', description: 'Most capable model' },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', description: 'Fast and efficient' }
  }
  
  const connectedApps: any[] = []
  
  const threadData = {
    thread_id: null,
    model: 'gpt-4',
    artifacts: []
  }
  
  const modelOverride = typeof query.modelOverride === 'string' ? query.modelOverride : null
  
  const selectedDataSource = 1
  
  const userData = {
    id: null,
    name: 'Anonymous User',
    email: null,
    accessToken: process.env.CAMEL_API_KEY
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