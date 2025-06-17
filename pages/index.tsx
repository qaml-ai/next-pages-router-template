import type { GetServerSideProps } from 'next'
import React, { useMemo } from 'react'
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
  client: CamelClient
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
  const client = useMemo(
    () => new CamelClient(() => userData?.accessToken, "http://localhost:8000"),
    [userData?.accessToken],
  )

  return (
    <App
      client={client}
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
  const initialMessages = [
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      artifacts: []
    }
  ]
  
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
  
  const selectedDataSource = null
  
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