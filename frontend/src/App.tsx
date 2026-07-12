/**
 * Application root.
 * Wraps the router with context providers.
 */

import { AuthProvider } from '@/context/AuthContext'
import AppRouter from '@/routes/AppRouter'

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
