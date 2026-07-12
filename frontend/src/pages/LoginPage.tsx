/**
 * Login page — email/password with client-side validation.
 */

import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
  return null
}

export default function LoginPage() {
  useDocumentTitle('Sign In')

  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [emailErr, setEmailErr] = useState<string | null>(null)
  const [passErr,  setPassErr]  = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  function validate(): boolean {
    const eErr = validateEmail(email)
    const pErr = password.length === 0 ? 'Password is required.' : null
    setEmailErr(eErr)
    setPassErr(pErr)
    return !eErr && !pErr
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return
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
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          id="email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={email}
          onChange={e => { setEmail(e.target.value); if (emailErr) setEmailErr(null) }}
          onBlur={() => setEmailErr(validateEmail(email))}
          error={emailErr ?? undefined}
          disabled={loading}
          placeholder="you@company.com"
        />

        <Input
          id="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={e => { setPassword(e.target.value); if (passErr) setPassErr(null) }}
          onBlur={() => setPassErr(password.length === 0 ? 'Password is required.' : null)}
          error={passErr ?? undefined}
          disabled={loading}
          placeholder="••••••••"
        />

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
