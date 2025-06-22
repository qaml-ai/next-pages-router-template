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
  clientOverride: { apiUrl: string } | CamelClient | null
  dataSources: any[]
  error?: { type: 'API_KEY_MISSING' | 'API_ERROR'; message: string }
}

// Shared styles
const styles = {
  fullScreen: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
    minHeight: '100vh'
  },
  modal: {
    backgroundColor: 'var(--clr-var-light-background)',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: '28rem',
    margin: '0 1rem',
    border: '1px solid var(--clr-var-button-outline)'
  },
  iconCircle: {
    width: '4rem',
    height: '4rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem'
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 'var(--fw-semi)' as const,
    fontSize: 'var(--fs-p)',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s'
  }
}

const CenteredModal: React.FC<{ children: React.ReactNode; error?: boolean }> = ({ children, error }) => (
  <div style={styles.fullScreen}>
    <div style={{ ...styles.modal, ...(error && { border: '1px solid #fee2e2' }) }}>
      {children}
    </div>
  </div>
)

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
  error,
}: IndexProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDs, setSelectedDs] = useState<string | null>(null);
  const [tempSelectedDs, setTempSelectedDs] = useState<string | null>(null);

  const getAccessToken = async (threadId?: string) => {
    const response = await fetch('/api/token', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: selectedDs, ...(threadId && { thread_id: threadId }) })
    });
    return response.ok ? response.text() : null;
  };

  useEffect(() => { 
    setIsMounted(true);
    const lastSelected = localStorage.getItem('lastSelectedDataSource');
    if (lastSelected && dataSources.some(ds => ds.id === lastSelected)) {
      setTempSelectedDs(lastSelected);
    }
  }, [dataSources]);

  if (!isMounted) return null;

  // Show error if API key is missing
  if (error) {
    return (
      <CenteredModal error>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...styles.iconCircle, backgroundColor: '#fee2e2' }}>
            <svg style={{ width: '2rem', height: '2rem', color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'var(--fw-bold)', color: '#dc2626', marginBottom: '0.75rem' }}>
            Configuration Error
          </h1>
          <p style={{ color: 'var(--clr-var-text-primary)', fontSize: 'var(--fs-p)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            {error.message}
          </p>
          
          {error.type === 'API_KEY_MISSING' && (
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', border: '1px solid var(--clr-var-button-outline)' }}>
              <p style={{ fontSize: 'var(--fs-mini)', color: 'var(--clr-var-text-faded)', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
                To fix this, set the environment variable:
              </p>
              <code style={{ display: 'block', backgroundColor: 'var(--clr-var-dark-background)', padding: '0.5rem', borderRadius: '4px', fontSize: 'var(--fs-mini)', color: 'var(--clr-var-text-primary)', fontFamily: 'monospace' }}>
                CAMEL_API_KEY=your_api_key_here
              </code>
            </div>
          )}
        </div>
      </CenteredModal>
    );
  }

  // Create client override if apiUrl is provided from server
  const clientOverride = clientOverrideProp instanceof CamelClient 
    ? clientOverrideProp 
    : clientOverrideProp?.apiUrl 
      ? new CamelClient(getAccessToken, clientOverrideProp.apiUrl) 
      : null;

  // Show data source selector if none is selected
  if (!selectedDs) {
    return (
      <CenteredModal>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'var(--fw-bold)', color: 'var(--clr-var-text-highlight)', marginBottom: '0.5rem' }}>
            Welcome to Camel
          </h1>
          <p style={{ color: 'var(--clr-var-text-faded)', fontSize: 'var(--fs-p)' }}>
            Select a data source to continue
          </p>
        </div>
        
        {dataSources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ ...styles.iconCircle, backgroundColor: 'var(--clr-var-dark-background)' }}>
              <svg style={{ width: '2rem', height: '2rem' }} className="heroicon heroicon-xl" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <p style={{ color: 'var(--clr-var-text-primary)', marginBottom: '0.5rem', fontSize: 'var(--fs-p)' }}>
              No data sources available
            </p>
            <p style={{ fontSize: 'var(--fs-mini)', color: 'var(--clr-var-text-faded)', marginBottom: '1.5rem' }}>
              Add a data source to get started
            </p>
            <a href="https://console.camelai.com/data-sources/" target="_blank" rel="noopener noreferrer">
              <button 
                style={styles.primaryButton}
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
              <label style={{ display: 'block', fontSize: 'var(--fs-mini)', fontWeight: 'var(--fw-semi)', color: 'var(--clr-var-text-primary)', marginBottom: '0.5rem' }}>
                Data Source
              </label>
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
                ...styles.primaryButton,
                ...(tempSelectedDs ? {} : {
                  backgroundColor: 'var(--clr-var-dark-background)',
                  color: 'var(--clr-var-text-placeholder)',
                  cursor: 'not-allowed',
                  boxShadow: 'none'
                })
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
      </CenteredModal>
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

const defaultProps = {
  initialMessages: [],
  availableModels: {},
  connectedApps: [],
  threadID: null,
  modelOverride: null,
  selectedDataSource: null,
  userData: { id: null, name: 'Anonymous User', email: null },
  dataSources: [],
  clientOverride: null
};

export const getServerSideProps: GetServerSideProps<IndexProps> = async () => {
  const apiKey = process.env.CAMEL_API_KEY;
  
  if (!apiKey) {
    return {
      props: {
        ...defaultProps,
        error: {
          type: 'API_KEY_MISSING',
          message: 'The CAMEL_API_KEY environment variable is not set. Please configure it to use this application.'
        }
      }
    };
  }
  
  try {
    const camelClient = new CamelClient(apiKey, process.env.CAMEL_API_URL || 'https://api.camelai.com');
    const dataSources = await camelClient.listDataSources({ fetchAll: true });
    
    return {
      props: {
        ...defaultProps,
        dataSources,
        availableModels: {
          'o3': { name: 'o3', description: 'Most capable model' },
          'o4-mini': { name: 'o4-mini', description: 'Fast and efficient' }
        },
        clientOverride: process.env.CAMEL_API_URL ? { apiUrl: process.env.CAMEL_API_URL } : null
      }
    };
  } catch (error) {
    console.error('Failed to fetch data sources:', error);
    return {
      props: {
        ...defaultProps,
        error: {
          type: 'API_ERROR',
          message: 'Failed to connect to Camel API. Please check your API key and try again.'
        }
      }
    };
  }
}