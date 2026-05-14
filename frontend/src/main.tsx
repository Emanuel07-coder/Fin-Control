import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { Analytics } from '@vercel/analytics/react' // <--- 1. Importação correta para React

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Analytics /> {/* <--- 2. Adicionado aqui para monitorar todo o app */}
    </QueryClientProvider>
  </React.StrictMode>,
)

