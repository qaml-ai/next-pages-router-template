import '../styles/global.css'
import type { AppProps } from 'next/app'

// Global app component to initialize pages router app
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}