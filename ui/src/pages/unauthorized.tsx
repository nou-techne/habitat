import { useRouter } from 'next/router'
import { getCurrentUser } from '../lib/auth'

export default function UnauthorizedPage() {
  const router = useRouter()
  const user = getCurrentUser()

  return (
    <div className="unauthorized-page">
      <div className="container">
        <div className="icon">🔒</div>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        
        {user && (
          <div className="user-info">
            <p>Logged in as: <strong>{user.name}</strong></p>
            <p>Role: <strong>{user.role}</strong></p>
          </div>
        )}
        
        <div className="actions">
          <button onClick={() => router.back()}>
            Go Back
          </button>
          <button onClick={() => router.push('/dashboard')} className="primary">
            Go to Dashboard
          </button>
        </div>
      </div>

      <style jsx>{`
        .unauthorized-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #f7fafc;
        }
        .container {
          max-width: 500px;
          text-align: center;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }
        p {
          color: #718096;
          margin-bottom: 1rem;
        }
        .user-info {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 2rem 0;
        }
        .user-info p {
          margin: 0.5rem 0;
        }
        .actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        button {
          padding: 0.75rem 1.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background: white;
          color: #2d3748;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        button:hover {
          border-color: #cbd5e0;
          background: #f7fafc;
        }
        button.primary {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        button.primary:hover {
          background: #5a67d8;
          border-color: #5a67d8;
        }
      `}</style>
    </div>
  )
}
