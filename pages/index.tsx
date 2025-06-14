import type { GetServerSideProps } from 'next'
import ChatPage from '../components/ChatPage'

interface IndexProps {
  initialMessages: any[]
  availableModels: Record<string, any>
  connectedApps: any[]
  threadData: any
  modelOverride: string | null
}

export default function Index({
  initialMessages,
  availableModels,
  connectedApps,
  threadData,
  modelOverride,
}: IndexProps) {
  return (
    <ChatPage
      initialMessages={initialMessages}
      availableModels={availableModels}
      connectedApps={connectedApps}
      threadData={threadData}
      modelOverride={modelOverride}
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
  
  const connectedApps = []
  
  const threadData = {
    thread_id: null,
    model: 'gpt-4',
    artifacts: []
  }
  
  const modelOverride = typeof query.modelOverride === 'string' ? query.modelOverride : null

  return {
    props: { initialMessages, availableModels, connectedApps, threadData, modelOverride },
  }
}