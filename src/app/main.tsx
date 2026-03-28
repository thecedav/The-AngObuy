import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../index.css'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { AuthProvider } from '@/features/auth/context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
