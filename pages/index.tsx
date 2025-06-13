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
  const cookie = req.headers.cookie || ''
  const baseUrl = process.env.BACKEND_URL || ''
  const fetchJson = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${baseUrl}${path}`, { headers: { cookie } })
    if (!res.ok) throw new Error(`Failed to fetch ${path}`)
    return res.json()
  }

  const [initialMessages, availableModels, connectedApps, threadData] = await Promise.all([
    fetchJson<any[]>('/api/initial-messages/'),
    fetchJson<Record<string, any>>('/api/available-models/'),
    fetchJson<any[]>('/api/connected-apps/'),
    fetchJson<any>('/api/thread-data/'),
  ])

  const modelOverride = typeof query.modelOverride === 'string' ? query.modelOverride : null

  return {
    props: { initialMessages, availableModels, connectedApps, threadData, modelOverride },
  }
}