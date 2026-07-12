/**
 * Login page — calls the real auth API and redirects to dashboard on success.
 */

import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  useDocumentTitle('Sign In')

  const { login } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()

  // Redirect back to the page the user was trying to reach, or dashboard
  const from = (location.state as { from?: string })?.from ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Sign in to your account</h2>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1
                       focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1
                       focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-700">
          Create one
        </Link>
      </p>
    </>
  )
}
