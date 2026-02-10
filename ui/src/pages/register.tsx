import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import { gql, useMutation } from '@apollo/client'
import { setAuthToken, setCurrentUser } from '../lib/auth'

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
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

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [register, { loading }] = useMutation(REGISTER_MUTATION)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const result = await register({
        variables: {
          input: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
          },
        },
      })

      if (result.data?.register) {
        const { accessToken, refreshToken, user } = result.data.register

        // Store tokens
        setAuthToken(accessToken, refreshToken)

        // Store user info
        setCurrentUser(user)

        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
      console.error('Registration error:', err)
    }
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h1>Join Habitat</h1>
          <p className="subtitle">Create your member account</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <small>At least 8 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="footer-links">
            Already have an account? <a href="/login">Sign in</a>
          </div>

          <div className="terms">
            By creating an account, you agree to our{' '}
            <a href="/terms">Terms of Service</a> and{' '}
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }
        .register-container {
          width: 100%;
          max-width: 400px;
        }
        .register-card {
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
        small {
          display: block;
          margin-top: 0.25rem;
          color: #718096;
          font-size: 0.75rem;
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
          font-weight: 500;
        }
        .footer-links a:hover {
          text-decoration: underline;
        }
        .terms {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.75rem;
          color: #a0aec0;
          line-height: 1.5;
        }
        .terms a {
          color: #667eea;
          text-decoration: none;
        }
        .terms a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
