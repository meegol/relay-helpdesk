import '@fontsource-variable/schibsted-grotesk'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from './lib/auth'
import { RealtimeProvider } from './lib/realtime'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: '!bg-surface !text-ink !border-rule !shadow-float !font-sans !rounded-xl',
                description: '!text-ink-2',
                actionButton: '!bg-accent !text-accent-ink',
              },
            }}
          />
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
