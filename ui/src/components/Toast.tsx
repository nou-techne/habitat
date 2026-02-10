/**
 * Toast Notification System
 * 
 * Displays temporary notifications for user feedback
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const duration = toast.duration || 5000

    setToasts(prev => [...prev, { ...toast, id }])

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  }, [addToast])

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
      ))}

      <style jsx>{`
        .toast-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-width: 400px;
        }
      `}</style>
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const colors = {
    success: { bg: '#10b981', icon: '✓' },
    error: { bg: '#ef4444', icon: '✗' },
    warning: { bg: '#f59e0b', icon: '⚠' },
    info: { bg: '#3b82f6', icon: 'ℹ' },
  }

  const config = colors[toast.type]

  return (
    <div className="toast">
      <div className="icon">{config.icon}</div>
      <div className="content">
        <div className="title">{toast.title}</div>
        {toast.message && <div className="message">{toast.message}</div>}
      </div>
      <button className="close" onClick={onClose}>
        ×
      </button>

      <style jsx>{`
        .toast {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: start;
          padding: 1rem;
          gap: 0.75rem;
          animation: slideIn 0.3s ease-out;
          border-left: 4px solid ${config.bg};
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${config.bg};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }
        .content {
          flex: 1;
        }
        .title {
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 0.25rem;
        }
        .message {
          font-size: 0.875rem;
          color: #718096;
        }
        .close {
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          font-size: 1.5rem;
          line-height: 1;
          padding: 0;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }
        .close:hover {
          color: #718096;
        }
      `}</style>
    </div>
  )
}
