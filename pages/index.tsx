import type { GetServerSideProps } from 'next'
import React, { useEffect, useState } from 'react'
import App from '../components/chat/App'
import { CamelClient } from '../components/camelClient'

interface IndexProps {
  initialMessages: any[]
  availableModels: Record<string, any>
  connectedApps: any[]
  threadID: string | null
  modelOverride: string | null
  selectedDataSource: string | null
  userData: any
  clientOverride: { apiUrl: string } | null
  dataSources: any[]
}

export default function Index({
  initialMessages,
  availableModels,
  connectedApps,
  threadID,
  modelOverride,
  selectedDataSource,
  userData,
  dataSources,
  clientOverride: clientOverrideProp,
}: IndexProps) {
  const getAccessToken = async (threadId?: string) => {
    const payload: any = { source_id: selectedDs };
    if (threadId) {
      payload.thread_id = threadId;
    }
    
    const response = await fetch('/api/token', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    return response.ok ? response.text() : null;
  };

  // The App component is client-side only, so we need to wait for it to mount
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDs, setSelectedDs] = useState<string | null>(null);
  const [tempSelectedDs, setTempSelectedDs] = useState<string | null>(null);

  useEffect(() => { 
    setIsMounted(true);
    // Load last selected data source from localStorage
    const lastSelected = localStorage.getItem('lastSelectedDataSource');
    if (lastSelected && dataSources.some(ds => ds.id === lastSelected)) {
      setTempSelectedDs(lastSelected);
    }
  }, [dataSources]);

  if (!isMounted) return null;

  // Create client override if apiUrl is provided from server
  let clientOverride: CamelClient | null = null;
  if (clientOverrideProp?.apiUrl) {
    clientOverride = new CamelClient(getAccessToken, clientOverrideProp.apiUrl);
  }

  // Show data source selector if none is selected
  if (!selectedDs) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
        minHeight: '100vh'
      }}>
        <div style={{
          backgroundColor: 'var(--clr-var-light-background)',
          padding: '2.5rem',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: '28rem',
          margin: '0 1rem',
          border: '1px solid var(--clr-var-button-outline)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--clr-var-text-highlight)',
              marginBottom: '0.5rem'
            }}>Welcome to Camel</h1>
            <p style={{
              color: 'var(--clr-var-text-faded)',
              fontSize: 'var(--fs-p)'
            }}>Select a data source to continue</p>
          </div>
          
          {dataSources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  backgroundColor: 'var(--clr-var-dark-background)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <svg style={{ width: '2rem', height: '2rem' }} className="heroicon heroicon-xl" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
              </div>
              <p style={{
                color: 'var(--clr-var-text-primary)',
                marginBottom: '0.5rem',
                fontSize: 'var(--fs-p)'
              }}>No data sources available</p>
              <p style={{
                fontSize: 'var(--fs-mini)',
                color: 'var(--clr-var-text-faded)',
                marginBottom: '1.5rem'
              }}>Add a data source to get started</p>
              <a href="https://console.camelai.com/data-sources/" target="_blank" rel="noopener noreferrer">
                <button style={{
                  width: '100%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 'var(--fw-semi)',
                  fontSize: 'var(--fs-p)',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  Add Data Source
                </button>
              </a>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--fs-mini)',
                  fontWeight: 'var(--fw-semi)',
                  color: 'var(--clr-var-text-primary)',
                  marginBottom: '0.5rem'
                }}>Data Source</label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--clr-var-text-input-outline)',
                    borderRadius: '8px',
                    fontSize: 'var(--fs-p)',
                    color: 'var(--clr-var-text-primary)',
                    backgroundColor: 'var(--clr-var-primary-background)',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onChange={(e) => setTempSelectedDs(e.target.value)}
                  value={tempSelectedDs || ""}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--clr-var-text-input-outline)'}
                >
                  <option value="" disabled>Choose a data source</option>
                  {dataSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.account_name || ds.type}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 'var(--fw-bold)',
                  fontSize: 'var(--fs-p)',
                  cursor: tempSelectedDs ? 'pointer' : 'not-allowed',
                  border: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: tempSelectedDs ? '#2563eb' : 'var(--clr-var-dark-background)',
                  color: tempSelectedDs ? 'white' : 'var(--clr-var-text-placeholder)',
                  boxShadow: tempSelectedDs ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
                }}
                onClick={() => {
                  if (tempSelectedDs) {
                    localStorage.setItem('lastSelectedDataSource', tempSelectedDs);
                    setSelectedDs(tempSelectedDs);
                  }
                }}
                disabled={!tempSelectedDs}
                onMouseEnter={(e) => {
                  if (tempSelectedDs) {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tempSelectedDs) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <App
      getAccessToken={getAccessToken}
      initialMessages={initialMessages}
      availableModels={availableModels}
      connectedApps={connectedApps}
      threadID={threadID}
      modelOverride={modelOverride}
      selectedDataSource={selectedDs}
      userData={userData}
      clientOverride={clientOverride}
    />
  )
}

export const getServerSideProps: GetServerSideProps<IndexProps> = async () => {
  
  const camelClient = new CamelClient(process.env.CAMEL_API_KEY || '', process.env.CAMEL_API_URL || 'https://api.camelai.com');
  const dataSources = await camelClient.listDataSources({ fetchAll: true });
  
  const userData = {
    id: null,
    name: 'Anonymous User',
    email: null,
  }

  const connectedApps: any[] = []
  const initialMessages: any[] = []
  const threadID = null
  const modelOverride = null
  const availableModels = {
    'o3': { name: 'o3', description: 'Most capable model' },
    'o4-mini': { name: 'o4-mini', description: 'Fast and efficient' }
  }

  // Create clientOverride on server side if CAMEL_API_URL is set
  const clientOverride = process.env.CAMEL_API_URL ? {
    apiUrl: process.env.CAMEL_API_URL
  } : null;

  return {
    props: { 
      initialMessages, 
      availableModels, 
      connectedApps, 
      threadID, 
      modelOverride, 
      selectedDataSource: null, 
      userData,
      dataSources,
      clientOverride
    },
  }
}