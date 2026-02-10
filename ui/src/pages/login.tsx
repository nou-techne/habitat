import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import { gql, useMutation } from '@apollo/client'
import { apolloClient } from '../lib/apollo-client'
import { setAuthToken, setCurrentUser } from '../lib/auth'

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      user {
        userId
        memberId
        name
        email
        role
      }
    }
  }
`

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [login, { loading }] = useMutation(LOGIN_MUTATION)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const result = await login({
        variables: { email, password },
      })

      if (result.data?.login) {
        const { accessToken, refreshToken, user } = result.data.login

        // Store tokens
        setAuthToken(accessToken, refreshToken)

        // Store user info
        setCurrentUser(user)

        // Reset Apollo cache
        await apolloClient.resetStore()

        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
      console.error('Login error:', err)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Welcome to Habitat</h1>
          <p className="subtitle">Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email or ENS</label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@habitat.eth"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="footer-links">
            <a href="/forgot-password">Forgot password?</a>
            <span>·</span>
            <a href="/register">Create account</a>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <button className="magic-link-button" disabled>
            Sign in with Magic Link
            <span className="badge">Coming Soon</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }
        .login-container {
          width: 100%;
          max-width: 400px;
        }
        .login-card {
          background: white;
          border-radius: 8px;
          padding: 2.5rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        h1 {
          margin: 0 0 0.5rem;
          font-size: 1.75rem;
          color: #1a202c;
        }
        .subtitle {
          margin: 0 0 2rem;
          color: #718096;
          font-size: 0.9rem;
        }
        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .form-group {
          margin-bottom: 1.25rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #2d3748;
          font-size: 0.875rem;
        }
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .submit-button {
          width: 100%;
          padding: 0.875rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .submit-button:hover:not(:disabled) {
          background: #5a67d8;
        }
        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .footer-links {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.875rem;
          color: #718096;
        }
        .footer-links a {
          color: #667eea;
          text-decoration: none;
        }
        .footer-links a:hover {
          text-decoration: underline;
        }
        .footer-links span {
          margin: 0 0.5rem;
        }
        .divider {
          margin: 1.5rem 0;
          text-align: center;
          position: relative;
        }
        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e2e8f0;
        }
        .divider span {
          position: relative;
          background: white;
          padding: 0 1rem;
          color: #a0aec0;
          font-size: 0.875rem;
        }
        .magic-link-button {
          width: 100%;
          padding: 0.875rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 1rem;
          cursor: not-allowed;
          opacity: 0.6;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .badge {
          background: #edf2f7;
          color: #4a5568;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
