import React from 'react'

export interface LoadingStateProps {
  text?: string
  size?: 'small' | 'medium' | 'large'
}

export function LoadingState({ text = 'Loading...', size = 'medium' }: LoadingStateProps) {
  const spinnerSize = {
    small: '24px',
    medium: '48px',
    large: '64px',
  }[size]

  return (
    <div className="loading-state">
      <div className="spinner"></div>
      {text && <p>{text}</p>}
      
      <style jsx>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }
        .spinner {
          width: ${spinnerSize};
          height: ${spinnerSize};
          border: 3px solid #f3f3f3;
          border-top: 3px solid #1976d2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        p {
          margin-top: 1rem;
          color: #666;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export function LoadingSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton"></div>
      ))}
      
      <style jsx>{`
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .skeleton {
          height: 60px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s ease-in-out infinite;
          border-radius: 4px;
        }
        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  )
}
