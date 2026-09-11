'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    router.push('/calendar')
  }

  return (
    <div style={{ backgroundColor: '#FDF9F3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '360px', padding: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#2B2620', marginBottom: '4px', textAlign: 'center' }}>
          {mode === 'signin' ? 'Sign in' : 'Create an account'}
        </h1>
        <p style={{ fontSize: '13px', color: '#8A7F6C', marginBottom: '20px', textAlign: 'center' }}>
          to access your meal plan
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '10px 14px', fontSize: '14px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '10px 14px', fontSize: '14px' }}
          />

          {error && <p style={{ color: '#B25A45', fontSize: '13px' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: '#2B2620', color: '#fff', borderRadius: '10px', padding: '11px', fontSize: '14px', fontWeight: 500, marginTop: '4px' }}
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#8A7F6C', marginTop: '16px' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ color: '#7C4DFF', fontWeight: 500 }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}